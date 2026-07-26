// Thin fetch client for POST /api/v1/designs/share.
//
// The route is deliberately fail-closed: when it cannot persist the share it
// answers 503 SHARE_STORE_UNAVAILABLE with NO shareId, because a link that
// cannot be read back is a broken promise (see src/lib/shared-design-store.ts).
// This client mirrors that stance — it only ever resolves with a link it
// actually received, so the UI has no way to render a copyable link that
// leads nowhere.
//
// Error shape follows DesignSessionRequestError in
// src/features/design-session/services/designSessionApi.ts: carry the route's
// `code` and status, not just a sentence.

import { getApiAuthHeaders } from '@/lib/client-api-auth';

export class ShareRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, fields: { code: string; status: number }) {
    super(message);
    this.name = 'ShareRequestError';
    this.code = fields.code;
    this.status = fields.status;
  }
}

export interface CreateShareRequest {
  imageUrl: string;
  prompt: string;
  style?: string;
  bodyPart?: string;
}

/** A share that exists and can be opened. Both fields are always present. */
export interface CreatedShare {
  shareId: string;
  shareUrl: string;
}

const ENDPOINT = '/api/v1/designs/share';

/**
 * Mint a share link for a design. Throws ShareRequestError on every path
 * that does not end in a usable link.
 *
 * The route is Firebase-auth gated, so a missing session throws before the
 * request is made (getApiAuthHeaders also raises the global sign-in modal);
 * an expired token comes back as a 401, which raises the same modal.
 */
export async function createShare(request: CreateShareRequest): Promise<CreatedShare> {
  let authHeaders: Record<string, string>;
  try {
    authHeaders = await getApiAuthHeaders();
  } catch {
    // getApiAuthHeaders has already opened the sign-in modal.
    throw new ShareRequestError('Sign in to share this design.', {
      code: 'AUTH_REQUIRED',
      status: 401,
    });
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(request),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. a 500 HTML page) — fall through to the status error.
  }
  const payload = (data ?? {}) as {
    shareId?: string;
    shareUrl?: string;
    error?: string;
    code?: string;
  };

  if (res.status === 401) {
    // Token present but rejected — the session lapsed mid-session.
    if (typeof window !== 'undefined') {
      const { useAuthStore } = await import('@/store/useAuthStore');
      useAuthStore.getState().promptSignIn();
    }
    throw new ShareRequestError('Your session expired. Sign in again to share.', {
      code: payload.code ?? 'AUTH_REQUIRED',
      status: 401,
    });
  }

  if (!res.ok) {
    throw new ShareRequestError(payload.error ?? `Share failed (${res.status})`, {
      code: payload.code ?? 'SHARE_FAILED',
      status: res.status,
    });
  }

  // A 2xx without a usable link is still a failure. Treating it as success
  // is exactly the bug the 503 path exists to prevent, one layer up.
  if (!payload.shareId || !payload.shareUrl) {
    throw new ShareRequestError('Sharing is temporarily unavailable.', {
      code: 'SHARE_INCOMPLETE',
      status: res.status,
    });
  }

  return { shareId: payload.shareId, shareUrl: payload.shareUrl };
}

/** Codes where the honest thing to add is "no link was created". */
export function isNoLinkCode(code: string): boolean {
  return code === 'SHARE_STORE_UNAVAILABLE' || code === 'SHARE_INCOMPLETE';
}
