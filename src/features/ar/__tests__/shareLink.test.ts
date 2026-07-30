import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveShareLink, clearShareLinkCache } from '../shareLink';

/**
 * The fail-soft link resolver for the AR share moment. The contract:
 *  - signed out ⇒ null, and the share API is never called (no sign-in modal
 *    in the middle of the wow moment);
 *  - signed in ⇒ the existing share API mints the link, once per design;
 *  - any failure ⇒ null, never a throw — the capture shares linkless.
 */

const createShare = vi.fn();
const authState: { currentUser: object | null } = { currentUser: null };

vi.mock('@/lib/firebase', () => ({
  get auth() {
    return {
      get currentUser() {
        return authState.currentUser;
      },
      authStateReady: async () => {},
    };
  },
}));

vi.mock('@/features/share/services/shareApi', () => ({
  createShare: (...args: unknown[]) => createShare(...args),
}));

const design = { id: 'd1', image: 'https://cdn.example/cut.png', title: 'Death Moth' };

beforeEach(() => {
  clearShareLinkCache();
  createShare.mockReset();
  authState.currentUser = null;
});

describe('resolveShareLink', () => {
  it('returns null for a signed-out user WITHOUT calling the share API', async () => {
    expect(await resolveShareLink(design)).toBeNull();
    expect(createShare).not.toHaveBeenCalled();
  });

  it('mints the design link through the existing share API when signed in', async () => {
    authState.currentUser = { uid: 'u1' };
    createShare.mockResolvedValue({ shareId: 's1', shareUrl: 'https://t.example/share/s1' });

    expect(await resolveShareLink(design)).toBe('https://t.example/share/s1');
    expect(createShare).toHaveBeenCalledWith({
      imageUrls: ['https://cdn.example/cut.png'],
      prompt: 'Death Moth',
    });
  });

  it('caches per design — a durable link is minted once, not per tap', async () => {
    authState.currentUser = { uid: 'u1' };
    createShare.mockResolvedValue({ shareId: 's1', shareUrl: 'https://t.example/share/s1' });

    await resolveShareLink(design);
    await resolveShareLink(design);
    expect(createShare).toHaveBeenCalledTimes(1);
  });

  it('returns null instead of throwing when minting fails — the share goes out linkless', async () => {
    authState.currentUser = { uid: 'u1' };
    createShare.mockRejectedValue(new Error('SHARE_STORE_UNAVAILABLE'));
    expect(await resolveShareLink(design)).toBeNull();
  });
});
