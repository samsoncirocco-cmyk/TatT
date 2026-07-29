// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import TermsPage from './page';

afterEach(cleanup);

vi.mock('@/components/studio/StudioShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock('@/components/quiet/QuietHeadline', () => ({
  default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

describe('TermsPage — messaging section (TAT-49)', () => {
  it('carries the SMS consent, rates, and STOP/HELP note', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /messaging/i })).toBeTruthy();
    const text = (document.body.textContent ?? '').replace(/ /g, ' ');
    expect(text).toContain(
      'By texting SketchBot at the number published on this site you agree to receive conversational replies.'
    );
    expect(text).toContain('Message and data rates may apply');
    expect(text).toContain('reply STOP to opt out or HELP for help');
  });
});
