// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DesignSession } from '@/services/designSession/types';
import { HandoffCard } from '../components/HandoffCard';

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
  it('threads the session id into the Find-my-artist handoff URL', () => {
    render(<HandoffCard session={completeSession} />);
    expect(
      screen.getByRole('link', { name: /find my artist/i }).getAttribute('href')
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
      screen.getByRole('link', { name: /find my artist/i }).getAttribute('href')
    ).toBe(`/smart-match?ds=${encodeURIComponent('sess/odd id')}`);
  });
});
