/**
 * "Should I get this?" — hand an AR capture to the group chat.
 *
 * Path selection, not transport: the capture goes out through the OS share
 * sheet (navigator.share with files) when the browser supports it, and
 * degrades to download + copy-the-link when it does not. Both paths are
 * explicit user actions.
 *
 * PRIVACY INVARIANT (load-bearing): the privacy policy promises camera
 * frames never leave the device. This module performs no network I/O — no
 * fetch, no XHR, no sendBeacon. The only ways a capture exits are the share
 * sheet the user tapped and the download the user tapped. The design's
 * share *link* (a URL string minted elsewhere from the design's hosted
 * image, never from camera pixels) is carried as text only.
 */

/** The slice of `navigator` this module needs; injectable for tests. */
export interface ShareCapableNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export type SharePath = 'native' | 'fallback';

function defaultNavigator(): ShareCapableNavigator {
  return typeof navigator === 'undefined' ? {} : (navigator as ShareCapableNavigator);
}

/**
 * Which door does this capture leave through?
 *
 * 'native' only when the browser affirms it can share THIS file — a
 * navigator.share that exists but rejects files (older desktop browsers)
 * must land on the fallback, not throw at tap time.
 */
export function selectSharePath(
  file: File,
  nav: ShareCapableNavigator = defaultNavigator(),
): SharePath {
  if (typeof nav.share !== 'function') return 'fallback';
  if (typeof nav.canShare !== 'function') return 'fallback';
  try {
    return nav.canShare({ files: [file] }) ? 'native' : 'fallback';
  } catch {
    return 'fallback';
  }
}

/**
 * The sentence that rides along with the capture. Loud register — the
 * pop-punk confidant handing the phone over, not a marketing string.
 */
export function buildShareText(designTitle?: string): string {
  const name = designTitle?.trim();
  return name
    ? `should I get "${name}"? real answers only.`
    : 'should I get this? real answers only.';
}

export interface ShareCaptureRequest {
  file: File;
  /** Ready-made share text; see buildShareText. */
  text: string;
  /** The design's share link, when one exists. Carried as a URL, never a file. */
  url?: string;
}

export type ShareCaptureOutcome =
  /** The share sheet opened and the user completed it. */
  | { kind: 'shared' }
  /** The user opened the sheet and backed out — not an error, say nothing. */
  | { kind: 'cancelled' }
  /** Native share unavailable or failed — caller should run the fallback. */
  | { kind: 'fallback' };

/**
 * One tap: open the OS share sheet with the capture (and the design link
 * when there is one). Never throws — every path collapses to an outcome the
 * UI can render.
 */
export async function shareCapture(
  request: ShareCaptureRequest,
  nav: ShareCapableNavigator = defaultNavigator(),
): Promise<ShareCaptureOutcome> {
  if (selectSharePath(request.file, nav) !== 'native') return { kind: 'fallback' };

  const data: ShareData = {
    files: [request.file],
    text: request.text,
    ...(request.url ? { url: request.url } : {}),
  };

  try {
    await nav.share!(data);
    return { kind: 'shared' };
  } catch (error) {
    // AbortError is the user closing the sheet. Anything else is the
    // browser reneging on canShare — degrade instead of surfacing an error
    // for a moment that should feel effortless.
    if (error instanceof Error && error.name === 'AbortError') {
      return { kind: 'cancelled' };
    }
    return { kind: 'fallback' };
  }
}

/**
 * Copy the design link for the fallback path. Returns false when the
 * clipboard is blocked so the UI can say so — a silent no-op reads exactly
 * like a successful copy.
 */
export async function copyLinkToClipboard(
  url: string,
  nav: ShareCapableNavigator = defaultNavigator(),
): Promise<boolean> {
  if (!nav.clipboard?.writeText) return false;
  try {
    await nav.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
