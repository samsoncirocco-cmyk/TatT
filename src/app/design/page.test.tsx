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
