/**
 * Session-store tests: backing-store selection (env conventions), the
 * in-memory impl, and the Firestore impl with firebase-admin fully mocked
 * — no live Firestore call is ever made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const firestoreMocks = vi.hoisted(() => {
  const set = vi.fn();
  const get = vi.fn();
  const doc = vi.fn(() => ({ set, get }));
  const collection = vi.fn(() => ({ doc }));
  const getFirestore = vi.fn(() => ({ collection }));
  return { set, get, doc, collection, getFirestore };
});

vi.mock('firebase-admin/firestore', () => ({ getFirestore: firestoreMocks.getFirestore }));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: vi.fn(() => false) }));

import {
  resolveSessionStore,
  memorySessionStore,
  firestoreSessionStore,
  clearMemorySessions,
} from '../internal/store';
import type { StoredSession } from '../internal/store';
import { ensureAdminApp } from '@/lib/firebase-admin';

const mockEnsureAdminApp = vi.mocked(ensureAdminApp);

function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'sess-1',
    phase: 'revealed',
    intake: {
      placement: 'forearm',
      styleTags: ['traditional'],
      meaning: 'anchor for my dad',
      references: [],
      ambiguousAxes: [],
    },
    axisSelection: { mode: 'compositional', axes: [], rationale: 'resolved' },
    provider: 'replicate',
    pinnedModelId: 'sdxl',
    variations: [
      {
        id: 'v1',
        axisPosition: { composition: 'centered emblem' },
        prompt: 'p1',
        // negativePrompt and imageUrl deliberately absent (undefined)
      },
    ],
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

let savedDemoMode: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  clearMemorySessions();
  savedDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;
  delete process.env.NEXT_PUBLIC_DEMO_MODE;
});

afterEach(() => {
  if (savedDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
  else process.env.NEXT_PUBLIC_DEMO_MODE = savedDemoMode;
});

describe('resolveSessionStore', () => {
  it('uses the in-memory store in demo mode, even with Firebase configured', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    mockEnsureAdminApp.mockReturnValue('sa-json');
    expect(resolveSessionStore()).toBe(memorySessionStore);
  });

  it('uses Firestore when Firebase Admin credentials are wired', () => {
    mockEnsureAdminApp.mockReturnValue('sa-json');
    expect(resolveSessionStore()).toBe(firestoreSessionStore);
  });

  it('falls back to the in-memory store when Firebase is unconfigured', () => {
    mockEnsureAdminApp.mockReturnValue(false);
    expect(resolveSessionStore()).toBe(memorySessionStore);
  });
});

describe('memorySessionStore', () => {
  it('round-trips a session and returns null for unknown ids', async () => {
    const session = makeSession();
    await memorySessionStore.save(session);
    expect(await memorySessionStore.get('sess-1')).toEqual(session);
    expect(await memorySessionStore.get('unknown')).toBeNull();
  });

  /**
   * Every design-session route is its own Next.js entry point, and each
   * bundles its own instance of ../internal/store. A Map held in module
   * scope is therefore per-route, not per-process: a session written by
   * /converse was invisible to /[id]/confirm, which answered the user's
   * "show me" with "Session not found". Two module instances of the same
   * file reproduce exactly that.
   */
  it('shares sessions across module instances (one per Next route bundle)', async () => {
    const writer = await import('../internal/store');
    await writer.memorySessionStore.save(makeSession({ id: 'cross-route' }));

    vi.resetModules();
    const reader = await import('../internal/store');
    expect(reader.memorySessionStore).not.toBe(writer.memorySessionStore);

    expect(await reader.memorySessionStore.get('cross-route')).not.toBeNull();
  });

  it('stores and returns copies, not live references', async () => {
    const session = makeSession();
    await memorySessionStore.save(session);
    session.phase = 'complete'; // mutate the caller's object after save

    const fetched = await memorySessionStore.get('sess-1');
    expect(fetched?.phase).toBe('revealed');

    fetched!.phase = 'picked'; // mutate the fetched copy
    expect((await memorySessionStore.get('sess-1'))?.phase).toBe('revealed');
  });
});

describe('firestoreSessionStore', () => {
  it('writes to design_sessions/<id> with undefined fields stripped', async () => {
    const session = makeSession();
    await firestoreSessionStore.save(session);

    expect(firestoreMocks.collection).toHaveBeenCalledWith('design_sessions');
    expect(firestoreMocks.doc).toHaveBeenCalledWith('sess-1');
    const saved = firestoreMocks.set.mock.calls[0][0] as Record<string, unknown>;
    // Firestore rejects undefined-valued fields — absent optionals must be
    // dropped, not written as undefined.
    expect('pickId' in saved).toBe(false);
    const variation = (saved.variations as Record<string, unknown>[])[0];
    expect('negativePrompt' in variation).toBe(false);
    expect('imageUrl' in variation).toBe(false);
    expect(saved.id).toBe('sess-1');
    expect(saved.pinnedModelId).toBe('sdxl');
  });

  it('reads a session back and returns null when the doc is missing', async () => {
    const session = makeSession();
    firestoreMocks.get.mockResolvedValueOnce({ exists: true, data: () => session });
    expect(await firestoreSessionStore.get('sess-1')).toEqual(session);

    firestoreMocks.get.mockResolvedValueOnce({ exists: false, data: () => undefined });
    expect(await firestoreSessionStore.get('gone')).toBeNull();
  });
});
