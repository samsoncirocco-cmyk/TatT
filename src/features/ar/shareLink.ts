'use client';

/**
 * The design's share link, resolved for the AR share moment — fail-soft.
 *
 * The mirror's share tap should work for everyone, signed in or not, so
 * this helper NEVER prompts: a signed-out user gets `null` (the capture
 * still shares, just without a link), and only a signed-in user mints a
 * durable link through the existing share API.
 *
 * Privacy note: what goes to the share endpoint is the design's hosted
 * image URL and prompt — the same payload the Share button elsewhere sends.
 * Camera pixels never enter this module; the capture itself stays on-device
 * (see src/services/ar/captureService.ts).
 *
 * Dependencies are dynamically imported so the mirror doesn't pull Firebase
 * into its bundle (or its tests) unless a share is actually attempted.
 */

export interface ShareLinkDesign {
  id: string;
  image: string;
  title?: string;
}

/** One mint per design per session — links are durable, re-minting is noise. */
const cache = new Map<string, string>();

/** Test hook. */
export function clearShareLinkCache(): void {
  cache.clear();
}

export async function resolveShareLink(design: ShareLinkDesign): Promise<string | null> {
  const cached = cache.get(design.id);
  if (cached) return cached;

  try {
    const { auth } = await import('@/lib/firebase');
    if (auth && !auth.currentUser) {
      await auth.authStateReady();
    }
    // Signed out: no link, no prompt. The capture is the payload; the modal
    // would be a toll booth in the middle of the wow moment.
    if (!auth?.currentUser) return null;

    const { createShare } = await import('@/features/share/services/shareApi');
    const { shareUrl } = await createShare({
      imageUrls: [design.image],
      prompt: design.title ?? '',
    });
    cache.set(design.id, shareUrl);
    return shareUrl;
  } catch {
    // Store down, token lapsed, network gone — the share goes out linkless
    // rather than not at all.
    return null;
  }
}
