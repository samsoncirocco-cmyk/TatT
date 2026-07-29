// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PrivacyPage from './page';

afterEach(cleanup);

vi.mock('@/components/studio/StudioShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock('@/components/quiet/QuietHeadline', () => ({
  default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

describe('PrivacyPage — SMS section (TAT-49)', () => {
  it('discloses the SMS data collected, its use, and STOP/HELP', () => {
    render(<PrivacyPage />);

    const text = (document.body.textContent ?? '').replace(/ /g, ' ');
    expect(
      screen.getByRole('heading', { name: /texting with sketchbot \(sms\)/i })
    ).toBeTruthy();
    expect(text).toContain('phone number');
    expect(text).toContain('content of your messages');
    expect(text).toContain('design requests');
    expect(text).toContain('provide the design conversation service');
    expect(text).toContain('Message and data rates may apply');
    expect(text).toMatch(/Text STOP at any time to opt out/);
    expect(text).toMatch(/or HELP\s*for help/);
  });

  it('carries the carrier-required no-sharing sentence verbatim', () => {
    render(<PrivacyPage />);
    // Exact wording required by the A2P registration — do not paraphrase.
    expect(document.body.textContent).toContain(
      'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.'
    );
  });
});
