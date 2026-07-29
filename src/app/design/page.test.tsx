// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DesignPage from './page';

afterEach(cleanup);

vi.mock('@/components/studio/StudioShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock('@/components/punk/SlashHeadline', () => ({
  default: ({ slashed }: { slashed: string }) => <h1>{slashed}</h1>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// The conversation owns its own tests — the page test is about the shell.
vi.mock('@/features/design-session', () => ({
  DesignConversation: () => <div data-testid="conversation" />,
}));

afterEach(() => vi.unstubAllEnvs());

describe('DesignPage — SketchBot front door (TAT-48)', () => {
  it('headlines SketchBot and keeps the one-round chrome, loud register', async () => {
    render(<DesignPage />);

    // The header identifies the consultant by name (slashed headline).
    expect(await screen.findByRole('heading', { name: /sketchbot/i })).toBeTruthy();
    expect(screen.getByText(/your design consult/i)).toBeTruthy();
    // The chrome still promises the cadence, updated to fit the voice.
    // (&nbsp; keeps the phrases unbreakable, so normalize before matching.)
    const chrome = (document.body.textContent ?? '').replace(/ /g, ' ');
    expect(chrome).toContain('one round. then your artist.');
    expect(chrome).toContain('SketchBot — live');
    // The conversation mounts inside the Suspense boundary.
    expect(await screen.findByTestId('conversation')).toBeTruthy();
  });
});

describe('DesignPage — text SketchBot (TAT-49)', () => {
  it('publishes the formatted number, sms: link, and carrier disclosure when the env var is set', () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '+16029051867');
    render(<DesignPage />);

    const link = screen.getByRole('link', { name: '(602) 905-1867' });
    expect(link.getAttribute('href')).toBe('sms:+16029051867');

    const text = (document.body.textContent ?? '').replace(/ /g, ' ');
    expect(text).toContain('text your idea to SketchBot');
    // The carrier disclosure sits directly beside the number (A2P review
    // checks for it) with both policy links.
    expect(text).toContain(
      'By texting SketchBot you agree to receive conversational replies. Msg & data rates may apply. Message frequency varies. Reply STOP to opt out, HELP for help. See our Privacy Policy and Terms.'
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe(
      '/legal/privacy'
    );
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe(
      '/legal/terms'
    );
  });

  it('renders no SMS mention at all when the env var is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '');
    render(<DesignPage />);

    expect(document.body.textContent).not.toContain('text your idea');
    expect(document.body.textContent).not.toContain('By texting SketchBot');
    expect(document.querySelector('a[href^="sms:"]')).toBeNull();
  });
});
