/**
 * Shared-design store tests: backing-store selection (including the
 * credentials-missing degradation path), the in-memory impl, the Firestore
 * impl with firebase-admin fully mocked, and the public projection.
 * No live Firestore call is ever made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const firestoreMocks = vi.hoisted(() => {
  const set = vi.fn();
  const get = vi.fn();
  const update = vi.fn();
  const doc = vi.fn(() => ({ set, get, update }));
  const collection = vi.fn(() => ({ doc }));
  const getFirestore = vi.fn(() => ({ collection }));
  const increment = vi.fn((n: number) => ({ __increment: n }));
  return { set, get, update, doc, collection, getFirestore, increment };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: firestoreMocks.getFirestore,
  FieldValue: { increment: firestoreMocks.increment },
}));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: vi.fn(() => false) }));

import {
  resolveSharedDesignStore,
  memorySharedDesignStore,
  firestoreSharedDesignStore,
  clearMemoryShares,
  toPublicShare,
  type SharedDesign,
} from './shared-design-store';
import { ensureAdminApp } from '@/lib/firebase-admin';

const mockEnsureAdminApp = vi.mocked(ensureAdminApp);

function makeShare(overrides: Partial<SharedDesign> = {}): SharedDesign {
  return {
    shareId: 'abc1234567',
    imageUrl: 'https://img/design.png',
    prompt: 'fine line fern on the forearm',
    style: 'fine-line',
    // bodyPart deliberately absent (undefined)
    uid: 'user-1',
    generatedAt: '2026-07-25T00:00:00.000Z',
    sharedAt: '2026-07-25T00:00:00.000Z',
    shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
    views: 0,
    ...overrides,
  };
}

let savedDemoMode: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  clearMemoryShares();
  savedDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;
  delete process.env.NEXT_PUBLIC_DEMO_MODE;
});

afterEach(() => {
  if (savedDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
  else process.env.NEXT_PUBLIC_DEMO_MODE = savedDemoMode;
});

describe('resolveSharedDesignStore', () => {
  it('uses the in-memory store in demo mode, even with Firebase configured', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    mockEnsureAdminApp.mockReturnValue('sa-json');
    expect(resolveSharedDesignStore()).toBe(memorySharedDesignStore);
  });

  it('uses Firestore when Firebase Admin credentials are wired', () => {
    mockEnsureAdminApp.mockReturnValue('sa-json');
    expect(resolveSharedDesignStore()).toBe(firestoreSharedDesignStore);
  });

  it('returns null when credentials are missing — never a silent memory fallback', () => {
    // The degradation path: no durable store means callers must fail loudly.
    // Falling back to memory here is precisely the data-loss bug (issue #64).
    mockEnsureAdminApp.mockReturnValue(false);
    expect(resolveSharedDesignStore()).toBeNull();
  });
});

describe('memorySharedDesignStore', () => {
  it('round-trips a share and returns null for unknown ids', async () => {
    const design = makeShare();
    await memorySharedDesignStore.save(design);

    const fetched = await memorySharedDesignStore.getAndCountView('abc1234567');
    expect(fetched).toMatchObject({ shareId: 'abc1234567', prompt: design.prompt });
    expect(await memorySharedDesignStore.getAndCountView('nope')).toBeNull();
  });

  it('counts a view on every read', async () => {
    await memorySharedDesignStore.save(makeShare());
    expect((await memorySharedDesignStore.getAndCountView('abc1234567'))?.views).toBe(1);
    expect((await memorySharedDesignStore.getAndCountView('abc1234567'))?.views).toBe(2);
  });

  it('stores and returns copies, not live references', async () => {
    const design = makeShare();
    await memorySharedDesignStore.save(design);
    design.prompt = 'mutated after save';

    const fetched = await memorySharedDesignStore.getAndCountView('abc1234567');
    expect(fetched?.prompt).toBe('fine line fern on the forearm');

    fetched!.prompt = 'mutated after fetch';
    expect((await memorySharedDesignStore.getAndCountView('abc1234567'))?.prompt).toBe(
      'fine line fern on the forearm'
    );
  });

  // Next bundles each route handler separately and re-evaluates modules on
  // hot reload, so the POST that writes a share and the GET that reads it do
  // not necessarily share a module instance. A module-scoped Map made every
  // demo-mode link 404. Re-importing the module is that split, in a test.
  it('is reachable from a second module instance — a link written by one route reads back on another', async () => {
    await memorySharedDesignStore.save(makeShare());

    vi.resetModules();
    const reimported = await import('./shared-design-store');

    expect(
      (await reimported.memorySharedDesignStore.getAndCountView('abc1234567'))?.prompt
    ).toBe('fine line fern on the forearm');
  });
});

describe('firestoreSharedDesignStore', () => {
  it('writes to shared_designs/<shareId> with undefined fields stripped', async () => {
    await firestoreSharedDesignStore.save(makeShare());

    expect(firestoreMocks.collection).toHaveBeenCalledWith('shared_designs');
    expect(firestoreMocks.doc).toHaveBeenCalledWith('abc1234567');
    const saved = firestoreMocks.set.mock.calls[0][0] as Record<string, unknown>;
    // Firestore rejects undefined-valued fields — absent optionals must be
    // dropped, not written as undefined.
    expect('bodyPart' in saved).toBe(false);
    expect(saved.shareId).toBe('abc1234567');
    expect(saved.uid).toBe('user-1');
  });

  it('reads a share back and atomically counts the view', async () => {
    firestoreMocks.get.mockResolvedValueOnce({ exists: true, data: () => makeShare({ views: 4 }) });

    const fetched = await firestoreSharedDesignStore.getAndCountView('abc1234567');

    expect(fetched?.prompt).toBe('fine line fern on the forearm');
    expect(fetched?.views).toBe(5);
    expect(firestoreMocks.increment).toHaveBeenCalledWith(1);
    expect(firestoreMocks.update).toHaveBeenCalledWith({ views: { __increment: 1 } });
  });

  it('returns null when the doc is missing', async () => {
    firestoreMocks.get.mockResolvedValueOnce({ exists: false, data: () => undefined });
    expect(await firestoreSharedDesignStore.getAndCountView('gone')).toBeNull();
    expect(firestoreMocks.update).not.toHaveBeenCalled();
  });

  it('still serves the design when the view counter write fails', async () => {
    firestoreMocks.get.mockResolvedValueOnce({ exists: true, data: () => makeShare() });
    firestoreMocks.update.mockRejectedValueOnce(new Error('quota exceeded'));

    const fetched = await firestoreSharedDesignStore.getAndCountView('abc1234567');
    expect(fetched?.shareId).toBe('abc1234567');
  });
});

describe('toPublicShare', () => {
  it('strips the owner uid and keeps the visitor-facing fields', () => {
    const publicShare = toPublicShare(makeShare({ bodyPart: 'forearm' }));
    expect('uid' in publicShare).toBe(false);
    expect(publicShare).toMatchObject({
      shareId: 'abc1234567',
      imageUrl: 'https://img/design.png',
      prompt: 'fine line fern on the forearm',
      style: 'fine-line',
      bodyPart: 'forearm',
      views: 0,
    });
  });
});
