// @vitest-environment jsdom
/**
 * The Studio as the refinery (ADR-0038): what each gear shows, what the
 * Studio no longer holds, and the keep-or-revert beat end to end.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const inpaintTattooDesign = vi.fn();

vi.mock('@/features/inpainting/services/inpaintingService', () => ({
  inpaintTattooDesign: (...args) => inpaintTattooDesign(...args),
  INPAINT_BUDGET_EXHAUSTED: 'budget_exhausted',
}));

vi.mock('@/features/generate/services/regionMask', async (importOriginal) => ({
  ...(await importOriginal()),
  buildRegionMask: vi.fn(() => ({ width: 1024, height: 1024 })),
}));

// Konva, Firebase and the generation queue are not what this file is about.
vi.mock('@/features/generate/components/ForgeCanvas', () => ({
  ForgeCanvas: () => <div data-testid="forge-canvas" />,
}));
vi.mock('@/features/generate/components/MatchPulseSidebar', () => ({
  default: () => <div data-testid="match-pulse" />,
}));
vi.mock('@/features/match-pulse/hooks/useRealtimeMatchPulse', () => ({
  useRealtimeMatchPulse: () => ({ matches: [], totalMatches: 0, isLoading: false, error: null }),
}));
vi.mock('@/features/generate/hooks/useImageGeneration', () => ({
  useImageGeneration: () => ({
    generateHighRes: vi.fn(),
    isGenerating: false,
    error: null,
    arAsset: null,
  }),
}));

import Generate from '@/features/Generate';
import { ToastProvider } from '@/contexts/ToastContext';
import { useForgeStore } from '@/store/useForgeStore';
import {
  FULL_BENCH_DOOR_LABEL,
  FULL_BENCH_MOBILE_LINE,
  REFINERY_OPENER,
} from '../services/refineryVoice';

const DESIGN = {
  id: 'design-1',
  imageUrl: 'https://cdn.test/picked.png',
  prompt: 'a koi over the ribs',
  style: 'Traditional',
  bodyPart: 'ribs',
};

const DESKTOP = 1440;
const PHONE = 375;

function renderStudio(props = {}) {
  return render(
    <ToastProvider>
      <Generate {...props} />
    </ToastProvider>
  );
}

function setViewport(width) {
  window.innerWidth = width;
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  inpaintTattooDesign.mockReset();
  inpaintTattooDesign.mockResolvedValue('https://cdn.test/fixed.png');
  window.innerWidth = DESKTOP;
  // The layer store is a module singleton — a canvas left behind by one
  // test would otherwise stand in for the next test's picked design.
  useForgeStore.getState().clearLayers();
  useForgeStore.getState().clearHistory();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('gear 1 — point and say is the default surface', () => {
  it('opens on the canvas and one instruction line, with no tool palette', () => {
    renderStudio({ design: DESIGN });

    expect(screen.getByTestId('sketchbot-line').textContent).toBe(REFINERY_OPENER);
    expect(screen.getByTestId('region-canvas')).toBeTruthy();

    // Nothing from the bench is on the default surface.
    expect(screen.queryByTestId('forge-canvas')).toBeNull();
    expect(screen.queryByTestId('full-bench-panel')).toBeNull();
    expect(document.body.textContent).not.toContain('Layer Blend');
    expect(document.body.textContent).not.toContain('Blend Mode');
  });

  it('will not send a fix until a region and words both exist', () => {
    renderStudio({ design: DESIGN });

    const submit = screen.getByRole('button', { name: /redraw that bit/i });
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/what's wrong with that part/i), {
      target: { value: 'the hand is mangled' },
    });
    // Still no region circled.
    expect(screen.getByRole('button', { name: /redraw that bit/i }).disabled).toBe(true);
  });
});

describe('gear 2 — plain-language tools, one tap deeper', () => {
  it('shows the four plain labels without tool jargon', () => {
    renderStudio({ design: DESIGN });
    const row = screen.getByTestId('plain-tools');

    expect(row.textContent).toContain('redraw area');
    expect(row.textContent).toContain('erase');
    expect(row.textContent).toContain('resize part');
    expect(row.textContent).toContain('undo');
    expect(row.textContent).not.toMatch(/inpaint|mask|blend/i);
  });

  it('seeds gear 1 with plain words instead of opening a separate tool', () => {
    renderStudio({ design: DESIGN });

    fireEvent.click(screen.getByRole('button', { name: 'erase' }));

    const box = screen.getByLabelText(/what's wrong with that part/i);
    expect(box.value).toMatch(/erase this/i);
  });
});

describe('gear 3 — the full bench behind an explicit door', () => {
  it('hides the bench until the labelled door is opened', () => {
    renderStudio({ design: DESIGN });

    expect(screen.queryByTestId('full-bench-panel')).toBeNull();
    const door = screen.getByRole('button', { name: FULL_BENCH_DOOR_LABEL });
    expect(door.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(door);

    expect(screen.getByTestId('full-bench-panel')).toBeTruthy();
    expect(screen.getByTestId('forge-canvas')).toBeTruthy();
  });

  it('keeps everything the Studio had — layers, blend, versions, elements, stencil', () => {
    renderStudio({ design: DESIGN });
    fireEvent.click(screen.getByRole('button', { name: FULL_BENCH_DOOR_LABEL }));

    const bench = screen.getByTestId('full-bench-panel').textContent;
    expect(bench).toContain('Layers');
    expect(bench).toContain('Stencil View');
    expect(bench).toContain('Export Stencil');
    expect(screen.getByTestId('match-pulse')).toBeTruthy();
  });

  it('is unavailable on a phone, and says so in voice rather than cramping it', () => {
    setViewport(PHONE);
    renderStudio({ design: DESIGN });

    expect(screen.queryByRole('button', { name: FULL_BENCH_DOOR_LABEL })).toBeNull();
    expect(screen.queryByTestId('full-bench-panel')).toBeNull();
    expect(screen.getByTestId('full-bench-mobile-note').textContent).toBe(FULL_BENCH_MOBILE_LINE);

    // Gears 1 and 2 are fully present at 375px.
    expect(screen.getByTestId('region-canvas')).toBeTruthy();
    expect(screen.getByTestId('plain-tools')).toBeTruthy();
  });
});

describe('what the one door owns is shed (ADR-0028)', () => {
  it('has no prompt box, no vibe chips, and no body-part selector on the surface', () => {
    renderStudio({ design: DESIGN });
    fireEvent.click(screen.getByRole('button', { name: FULL_BENCH_DOOR_LABEL }));

    const text = document.body.textContent ?? '';
    expect(document.querySelector('textarea[placeholder^="Try:"]')).toBeNull();
    expect(text).not.toContain('Placement');
    expect(text).not.toContain('Vibe');
    expect(text).not.toMatch(/enhance with ai council/i);
  });

  it('no longer imports them at all', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../Generate.jsx'),
      'utf8'
    );
    expect(source).not.toContain('PromptInterface');
    expect(source).not.toContain('VibeChips');
    expect(source).not.toContain('BodyPartSelector');
  });
});

describe('the before/after beat', () => {
  it('shows both, applies nothing until keep, and counts the fix in voice', async () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '2');
    renderStudio({ design: DESIGN });

    const canvas = screen.getByTestId('region-canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 300,
      height: 300,
      right: 300,
      bottom: 300,
    });
    canvas.setPointerCapture = vi.fn();

    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 190, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(screen.getByTestId('region-lasso')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/what's wrong with that part/i), {
      target: { value: 'the hand is mangled' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redraw that bit/i }));

    const review = await screen.findByTestId('before-after');
    expect(review.querySelector('img[src="https://cdn.test/picked.png"]')).toBeTruthy();
    expect(review.querySelector('img[src="https://cdn.test/fixed.png"]')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /keep it/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sketchbot-line').textContent).toMatch(/one more fix/i);
    });
    expect(screen.queryByTestId('before-after')).toBeNull();
  });

  it('leaves the design alone on "put it back"', async () => {
    renderStudio({ design: DESIGN });

    const canvas = screen.getByTestId('region-canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 300,
      height: 300,
      right: 300,
      bottom: 300,
    });
    canvas.setPointerCapture = vi.fn();

    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    fireEvent.change(screen.getByLabelText(/what's wrong with that part/i), {
      target: { value: 'wrong shape' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redraw that bit/i }));

    await screen.findByTestId('before-after');
    fireEvent.click(screen.getByRole('button', { name: /put it back/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('before-after')).toBeNull();
    });
    expect(screen.getByTestId('region-canvas').querySelector('img').getAttribute('src')).toBe(
      'https://cdn.test/picked.png'
    );
  });
});

describe('the ceiling and the cap', () => {
  it('replaces the box with a booking door once the allowance is spent', () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '1');
    localStorage.setItem('tatt:studio-fixes', JSON.stringify({ 'design-1': 1 }));

    renderStudio({ design: DESIGN });

    expect(screen.queryByRole('button', { name: /redraw that bit/i })).toBeNull();
    const cta = screen.getByRole('link', { name: /find your artist/i });
    expect(cta.getAttribute('href')).toBe('/smart-match');
    expect(document.body.textContent).not.toMatch(/upgrade|buy credits|subscribe/i);
  });
});

describe('entering cold', () => {
  it('says there is nothing on the bench and points back at the one door', () => {
    renderStudio();

    expect(screen.getByTestId('studio-empty')).toBeTruthy();
    expect(screen.getByRole('link', { name: /start a design/i }).getAttribute('href')).toBe(
      '/design'
    );
    expect(screen.queryByTestId('region-canvas')).toBeNull();
  });
});
