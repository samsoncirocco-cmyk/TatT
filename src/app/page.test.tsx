// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Home from './page';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

vi.mock('@/components/studio/StudioShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock('@/components/punk/SlashHeadline', () => ({
  default: ({ slashed }: { slashed: string }) => <h1>{slashed}</h1>,
}));

vi.mock('@/components/punk/ArtistCard', () => ({
  default: () => <div data-testid="artist-card" />,
}));

// The featured grid owns its own tests; keep the homepage render hermetic.
vi.mock('@/lib/featured-artists', () => ({
  getFeaturedArtists: vi.fn().mockResolvedValue([]),
}));

describe('Home — hero: the two doors to SketchBot (TAT-52)', () => {
  it('renders both doors when the SMS number is published', async () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '+16029051867');
    render(await Home());

    // Door one: talking on the site.
    const talk = screen.getByRole('link', { name: /start talking/i });
    expect(talk.getAttribute('href')).toBe('/design');

    // Door two: the SMS number, a first-class equal.
    const text = screen.getByRole('link', { name: '(602) 905-1867' });
    expect(text.getAttribute('href')).toBe('sms:+16029051867');
    expect(document.body.textContent).toContain('or text your idea to');
  });

  it('keeps the talk door and drops the SMS door when the number is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '');
    render(await Home());

    expect(
      screen.getByRole('link', { name: /start talking/i }).getAttribute('href')
    ).toBe('/design');
    expect(document.querySelector('a[href^="sms:"]')).toBeNull();
  });

  it('shows the mock conversation beat', async () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '');
    render(await Home());

    const text = document.body.textContent ?? '';
    expect(text).toContain('an arm sleeve of my favorite anime');
    expect(text).toContain('say less. four takes coming.');
  });
});

describe('Home — text SketchBot mention (TAT-49)', () => {
  it('publishes the number with the sms: link and carrier disclosure when the env var is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '+16029051867');
    render(await Home());

    const link = screen.getByRole('link', { name: '(602) 905-1867' });
    expect(link.getAttribute('href')).toBe('sms:+16029051867');

    const text = (document.body.textContent ?? '').replace(/ /g, ' ');
    expect(text).toContain('SketchBot texts back four designs');
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

  it('renders no SMS mention at all when the env var is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '');
    render(await Home());

    expect(document.body.textContent).not.toContain('text your idea to');
    expect(document.body.textContent).not.toContain('By texting SketchBot');
    expect(document.querySelector('a[href^="sms:"]')).toBeNull();
  });
});
