// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import type { DesignSession } from '@/services/designSession/types';
import type { TattDesign } from '@/lib/tattStorage';
import { STORAGE_KEYS } from '@/lib/tattStorage';
import { HandoffCard } from '../components/HandoffCard';

function storedDesigns(): TattDesign[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.designs) ?? '[]');
}

const completeSession: DesignSession = {
  id: 'sess-42',
  phase: 'complete',
  intake: {
    placement: 'inner forearm',
    styleTags: ['fine-line'],
    meaning: 'strength after a rough year',
    references: [],
    ambiguousAxes: [],
  },
  axisSelection: {
    mode: 'compositional',
    axes: [],
    rationale: 'Style resolved — the four vary composition.',
  },
  provider: 'replicate',
  variations: [],
  refinedVariation: {
    id: 'v-refined',
    axisPosition: { composition: 'centered' },
    prompt: 'refined prompt',
    imageUrl: 'https://img.test/refined.png',
  },
  brief: {
    placement: 'inner forearm',
    styleTags: ['fine-line'],
    meaning: 'strength after a rough year',
    references: [],
    axisSelection: { mode: 'compositional', axes: [], rationale: 'Style resolved.' },
    placementNotes: [],
  },
  createdAt: '2026-07-24T00:00:00Z',
  updatedAt: '2026-07-24T00:00:00Z',
};

describe('HandoffCard CTAs', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it('threads the session id into the Find-your-artist handoff URL', () => {
    render(<HandoffCard session={completeSession} />);
    expect(
      screen.getByRole('link', { name: /find your artist/i }).getAttribute('href')
    ).toBe('/smart-match?ds=sess-42');
  });

  it('keeps the canvas CTA pointing at /generate', () => {
    render(<HandoffCard session={completeSession} />);
    expect(
      screen.getByRole('link', { name: /fine-tune on the canvas/i }).getAttribute('href')
    ).toBe('/generate');
  });

  it('URL-encodes session ids safely', () => {
    const oddSession = { ...completeSession, id: 'sess/odd id' };
    render(<HandoffCard session={oddSession} />);
    expect(
      screen.getByRole('link', { name: /find your artist/i }).getAttribute('href')
    ).toBe(`/smart-match?ds=${encodeURIComponent('sess/odd id')}`);
  });

  it('saves the refined cut to the local library once and points the AR CTA at it', async () => {
    render(<HandoffCard session={completeSession} />);

    await waitFor(() => expect(storedDesigns()).toHaveLength(1));
    const [design] = storedDesigns();
    expect(design.image).toBe('https://img.test/refined.png');
    expect(design.prompt).toBe('refined prompt');
    expect(design.sessionId).toBe('sess-42');

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /see it on your skin/i }).getAttribute('href')
      ).toBe(`/visualize?design=${encodeURIComponent(design.id)}&ds=sess-42`)
    );
  });

  it('does not duplicate the design on re-render of the same session', async () => {
    const first = render(<HandoffCard session={completeSession} />);
    await waitFor(() => expect(storedDesigns()).toHaveLength(1));
    first.unmount();

    render(<HandoffCard session={completeSession} />);
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /see it on your skin/i }).getAttribute('href')
      ).toContain('design=')
    );
    expect(storedDesigns()).toHaveLength(1);
  });

  it('still offers the AR step (ds only) when the refined image is missing', () => {
    const noImage = {
      ...completeSession,
      refinedVariation: { ...completeSession.refinedVariation!, imageUrl: undefined },
    };
    render(<HandoffCard session={noImage} />);
    expect(
      screen.getByRole('link', { name: /see it on your skin/i }).getAttribute('href')
    ).toBe('/visualize?ds=sess-42');
    expect(storedDesigns()).toHaveLength(0);
  });
});
