/**
 * One-off verification for the realism → Flux Dev routing change.
 *
 * Not part of the test suite: it spends real Replicate money. It exists so
 * the routing claim rests on rendered output rather than on a reading of the
 * model's documentation — the mistake that produced the previous, wrong
 * recommendation ("Flux has a negative_prompt input"; it does not).
 *
 * It drives the SAME path a customer's reveal takes:
 *   enhanceStructured(intake)  → the real prompts + negatives
 *   routeGeneration(intake)    → the model under test
 *   generate(...)              → the real provider, incl. the Avoid: fold
 *
 * Run:  node --env-file=.env.local node_modules/.bin/vite-node scripts/verify-realism-routing.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { enhanceStructured } from '../src/services/council/internal/structuredMode.ts';
import { routeGeneration, generate } from '../src/services/generation/index.ts';

// Optional run label so repeat rounds accumulate instead of overwriting —
// these models are non-deterministic, and one clean render is not evidence.
const ROUND = process.argv[2] ?? '1';
const OUT = `/tmp/flux-realism-check/round-${ROUND}`;
mkdirSync(OUT, { recursive: true });

/** The two subjects Gemini failed on, plus one per remaining realism tag. */
const INTAKES = [
  {
    label: 'realism-wolf',
    placement: 'forearm',
    styleTags: ['realism'],
    meaning: 'a wolf standing at the treeline at dusk, watchful and alone',
    subject: 'a grey wolf, head and shoulders, facing the viewer',
    ambiguousAxes: [],
  },
  {
    label: 'portrait-fisherman',
    placement: 'upper arm',
    styleTags: ['portrait'],
    meaning: 'my grandfather, who fished the same stretch of coast for forty years',
    subject: 'an old fisherman with a weathered face and a heavy beard',
    ambiguousAxes: [],
  },
  {
    label: 'photorealistic-lion',
    placement: 'chest',
    styleTags: ['photorealistic'],
    meaning: 'strength held in reserve rather than shown off',
    subject: 'a male lion in three-quarter profile',
    ambiguousAxes: [],
  },
];

const run = async () => {
  const results = [];

  for (const { label, ...intake } of INTAKES) {
    const route = routeGeneration({ prompt: '', style: intake.styleTags, bodyPart: intake.placement });
    console.log(`\n=== ${label} → ${route.modelId} (${route.provider}) ===`);
    if (route.provider === 'vertex-ai') {
      throw new Error(`${label} still routes to Vertex — the change did not take`);
    }

    const { variations } = await enhanceStructured(intake);
    // One variation per intake keeps the spend honest; the prompt text is
    // what varies across the four, not the model or the text-avoidance.
    const variation = variations[0];
    const prompt = variation.prompts.detailed ?? variation.prompts.simple;

    console.log(`prompt:   ${prompt.slice(0, 160)}…`);
    console.log(`negative: ${variation.negativePrompt.slice(0, 160)}…`);

    const result = await generate({
      prompt,
      negativePrompt: variation.negativePrompt,
      modelId: route.modelId,
      aspectRatio: route.aspectRatio,
      numImages: 1,
      allowProviderFallback: false,
    });

    const url = result.images[0];
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = `${OUT}/${label}.png`;
    writeFileSync(file, bytes);
    console.log(`saved:    ${file} (${(bytes.length / 1024).toFixed(0)} KB)`);

    results.push({ label, model: result.metadata.model, provider: result.metadata.provider, file });
  }

  console.table(results);
  console.log('\nInspect each image for baked-in lettering. That is the failure Gemini showed 2/2.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
