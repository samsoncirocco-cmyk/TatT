// @vitest-environment jsdom
//
// The artist 404 is where a removed artist lands when they revisit their old
// profile URL — and where a stranger lands probing for one. The whole point of
// this file is that those two visits are indistinguishable.
//
// PR #195's reinstatement API deliberately refuses to confirm whether a
// tombstone exists ("no enumeration"). A reclaim door shown ONLY on removed
// profiles would leak from the UI exactly what the API refuses to leak. So the
// door lives on the shared not-found surface, which structurally cannot know
// why it rendered: `not-found.tsx` receives no props and reads no data.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const { queryLog } = vi.hoisted(() => ({ queryLog: [] as { query: string; params: any }[] }));

vi.mock('@/features/match-pulse/services/neo4jService', () => ({
  executeServerCypherQuery: vi.fn(async (query: string, params: any) => {
    queryLog.push({ query, params });
    // What the graph returns for a removed artist AND for a never-existed
    // one: nothing. NOT_REMOVED_CLAUSE makes the removed case identical to
    // the absent case at the data layer.
    return [];
  }),
}));

import { getRosterArtistById } from '@/lib/artists-graph';
import { NOT_REMOVED_CLAUSE } from '@/lib/takedown';
import NotFound from './not-found';

beforeEach(() => {
  queryLog.length = 0;
});

describe('profile lookup — removed reads as absent', () => {
  it('applies NOT_REMOVED_CLAUSE, so a removed artist resolves to null like a stranger', async () => {
    const result = await getRosterArtistById('artist_removed_1');
    expect(result).toBeNull();
    expect(queryLog).toHaveLength(1);
    expect(queryLog[0].query).toContain(NOT_REMOVED_CLAUSE);
  });
});

describe('artist not-found surface — the no-gossip property', () => {
  it('renders deterministically: no props, no data, so no way to differ per slug', () => {
    const a = render(<NotFound />);
    const htmlA = a.container.innerHTML;
    a.unmount();
    const b = render(<NotFound />);
    expect(b.container.innerHTML).toBe(htmlA);
  });

  it('never imports anything that could reveal removal state', () => {
    // A future edit that makes the 404 "smarter" — fetching the husk, checking
    // a tombstone — is exactly the leak this surface must never gain. Pin it
    // at the source level, the same way the ingest gate is pinned.
    for (const file of ['not-found.tsx', 'ReinstateDoor.tsx']) {
      const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
      expect(src, `${file} must not read artist data`).not.toMatch(
        /artists-graph|neo4jService|removedAt|Tombstone|takedown/i,
      );
    }
  });

  it('shows the reclaim door on every artist 404 — the same quiet line for everyone', () => {
    const { getByText } = render(<NotFound />);
    expect(getByText(/changed your mind/i)).toBeTruthy();
    expect(getByText(/reclaim/i)).toBeTruthy();
  });

  it('is honest that it does not say which kind of missing this is', () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).toMatch(/we don.t say which/i);
  });

  it('still offers a way out for the ordinary lost visitor', () => {
    const { container } = render(<NotFound />);
    const rosterLink = container.querySelector('a[href="/artists"]');
    expect(rosterLink).toBeTruthy();
  });
});
