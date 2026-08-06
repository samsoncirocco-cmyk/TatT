// Shared fixtures for the design-session route seam tests. Not a test file.
import { NextRequest } from 'next/server';
import type { DesignSession, Variation, Brief } from '@/services/designSession/types';

export function makeRequest(url: string, body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

export function routeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

export function makeVariations(): Variation[] {
  // One round's pair (ADR-0049): two cuts spread on one axis.
  return [
    { id: 'var-1', axisPosition: { 'bold-fine': 'bold' }, prompt: 'p1', imageUrl: 'https://img/1.png' },
    { id: 'var-2', axisPosition: { 'bold-fine': 'fine' }, prompt: 'p2', imageUrl: 'https://img/2.png' },
  ];
}

export function makeSession(overrides: Partial<DesignSession> = {}): DesignSession {
  return {
    id: 'sess-1',
    phase: 'revealed',
    intake: {
      placement: 'forearm',
      styleTags: ['blackwork'],
      meaning: 'for my grandmother',
      references: [],
      ambiguousAxes: ['bold-fine', 'color-blackwork'],
    },
    axisSelection: {
      mode: 'questionnaire',
      axes: ['bold-fine'],
      rationale: 'round one spreads the first ladder rung (ADR-0049)',
    },
    provider: 'vertex-ai',
    variations: makeVariations(),
    rounds: [{ round: 1, axis: 'bold-fine', variationIds: ['var-1', 'var-2'] }],
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

export function makeBrief(): Brief {
  return {
    placement: 'forearm',
    styleTags: ['blackwork'],
    meaning: 'for my grandmother',
    references: [],
    finalImageUrl: 'https://img/refined.png',
    axisSelection: {
      mode: 'questionnaire',
      axes: ['bold-fine', 'color-blackwork'],
      rationale: 'intake left line weight and color unresolved',
    },
    placementNotes: [],
    rejectedAxisPosition: { 'bold-fine': 'fine', 'color-blackwork': 'color' },
  };
}
