/**
 * Remembers, per browser, which share link this user minted for a given
 * selection of cuts (TAT-52). Designs live in localStorage (tattStorage) and
 * carry no shareId, so without this the owner's /designs/[id] page has no
 * way to know its design was ever shared — and therefore no tally to show.
 *
 * Keyed by the selection itself (the joined image URLs — the same identity
 * ShareDesignAction uses), because the selection is what a share IS. Sharing
 * the same selection again overwrites the entry with the newest link, which
 * is also the one whose poll the owner is currently running.
 *
 * Best-effort by design: storage full or blocked just means the owner's
 * verdict module stays hidden. The share link itself is never at risk here.
 */

const STORAGE_KEY = 'tatt:share-links';

export interface RememberedShare {
  shareId: string;
  shareUrl: string;
  sharedAt: string;
}

function selectionKey(imageUrls: string[]): string {
  return imageUrls.join(' ');
}

function readAll(): Record<string, RememberedShare> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, RememberedShare>)
      : {};
  } catch {
    return {};
  }
}

export function rememberShare(
  imageUrls: string[],
  share: { shareId: string; shareUrl: string }
): void {
  if (imageUrls.length === 0) return;
  try {
    const all = readAll();
    all[selectionKey(imageUrls)] = { ...share, sharedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Nothing remembered — the minted link still works; only the owner's
    // tally module loses sight of it.
  }
}

export function recallShare(imageUrls: string[]): RememberedShare | null {
  if (imageUrls.length === 0) return null;
  const entry = readAll()[selectionKey(imageUrls)];
  return entry && typeof entry.shareId === 'string' && entry.shareId.length > 0 ? entry : null;
}
