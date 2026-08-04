/*
 * Live check for the unrequested-lettering guard (#297). SKIPPED unless
 * TEXT_GUARD_LIVE=1, because it spends real money and needs credentials CI
 * does not have:
 *
 *   TEXT_GUARD_LIVE=1 npx vitest run src/services/generation/__tests__/textGuard.live.test.ts
 *
 * WHY IT EXISTS: the guard's classifier was validated 6/6 against PNGs on
 * disk, and it was right. The plumbing around it had never seen a real
 * provider result, and it was wrong — `resolveImagePayload` assumed a data URL
 * or bare base64, while Replicate returns an HTTPS URL. On Flux, the lane
 * actually in production, the gate would have skipped every render and
 * recorded `textGuardSkipped: parse`.
 *
 * "Installed and doing nothing" is the failure mode that survives every unit
 * test and every demo, precisely because the unit tests stub `fetch`. Only
 * auth and budget are stubbed here; the image fetch and the Vertex OCR call
 * are real.
 *
 * Run it whenever the guard's input handling changes, or a provider changes
 * the shape of what it hands back.
 */
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: vi.fn(async () => ({ allowed: true })),
  recordSpend: vi.fn(async () => {}),
  VISION_ANALYSIS_COST_CENTS: 1,
}));

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn(async () =>
    execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
      encoding: 'utf8',
    }).trim()
  ),
}));

import { screenForText } from '../internal/textGuard';

const live = process.env.TEXT_GUARD_LIVE === '1';
const FLUX_SLUG = 'black-forest-labs/flux-dev';

function replicateToken(): string {
  const fromEnv = process.env.REPLICATE_API_TOKEN;
  if (fromEnv) return fromEnv;
  const envFile = readFileSync('.env.local', 'utf8');
  const match = envFile.match(/^REPLICATE_API_TOKEN=(.*)$/m);
  if (!match) throw new Error('REPLICATE_API_TOKEN not found in env or .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/** One real Flux render, returned as the HTTPS URL Replicate actually hands back. */
async function fluxRenderUrl(): Promise<string> {
  const res = await fetch(`https://api.replicate.com/v1/models/${FLUX_SLUG}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${replicateToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt:
          'Flash art tattoo design on a pure white background, a flat scan of the ' +
          'artwork alone. A neo-traditional wolf head. Avoid: text, watermark, signature.',
        aspect_ratio: '1:1',
        output_format: 'png',
        num_outputs: 1,
      },
    }),
  });
  if (!res.ok) throw new Error(`Flux ${res.status}`);
  const prediction = await res.json();
  const output = prediction.output;
  return Array.isArray(output) ? output[0] : output;
}

describe.skipIf(!live)('text guard against real provider results', () => {
  it('screens a live Replicate HTTPS URL rather than skipping it', async () => {
    const verdict = await screenForText(
      await fluxRenderUrl(),
      'a neo-traditional wolf head tattoo'
    );

    /*
     * `screened` is the assertion that matters, not `intruded`. A skipped
     * verdict is what the bug produced, and it is indistinguishable from a
     * clean one at a glance — which is why it survived review.
     */
    expect(verdict.screened).toBe(true);
    expect(verdict.skipReason).toBeUndefined();
  }, 180_000);

  it('flags a lettered data URL', async () => {
    const sample = process.env.TEXT_GUARD_SAMPLE_PNG;
    if (!sample) return; // Needs a known-lettered render on disk.

    const verdict = await screenForText(
      `data:image/png;base64,${readFileSync(sample).toString('base64')}`,
      'Goku, Vegeta and Piccolo standing together'
    );

    expect(verdict.screened).toBe(true);
    expect(verdict.intruded).toBe(true);
  }, 180_000);
});
