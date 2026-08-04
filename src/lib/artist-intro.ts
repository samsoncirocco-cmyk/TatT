/** A no-money introduction request for a browse-only artist profile. */

export type ArtistIntroRequest = {
  /** Browser-generated retry key. One key maps to one graph record. */
  clientRequestId: string;
  artistId: string;
  clientName: string;
  clientEmail: string;
  message: string | null;
  /** Design-session id ("ds" query param) — links the intro to its Brief. */
  designSessionId?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export function validateArtistIntroRequest(
  body: unknown,
): { ok: true; value: ArtistIntroRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'A request body is required.' };
  }
  const input = body as Record<string, unknown>;
  const clientRequestId = typeof input.clientRequestId === 'string' ? input.clientRequestId.trim() : '';
  const artistId = typeof input.artistId === 'string' ? input.artistId.trim() : '';
  const clientName = typeof input.clientName === 'string' ? input.clientName.trim() : '';
  const clientEmail = typeof input.clientEmail === 'string' ? input.clientEmail.trim() : '';
  const rawMessage = typeof input.message === 'string' ? input.message.trim() : '';
  const designSessionId = optionalString(input.designSessionId, 120);

  if (!artistId || !/^artist_[A-Za-z0-9._-]+$/.test(artistId)) {
    return { ok: false, error: 'A valid artistId is required.' };
  }
  if (!REQUEST_ID.test(clientRequestId)) {
    return { ok: false, error: 'A valid request key is required.' };
  }
  if (!clientName || clientName.length > 120) {
    return { ok: false, error: 'Your name is required and must be 120 characters or fewer.' };
  }
  if (!EMAIL.test(clientEmail) || clientEmail.length > 254) {
    return { ok: false, error: 'A valid email address is required.' };
  }
  if (rawMessage.length > 2_000) {
    return { ok: false, error: 'Your note must be 2,000 characters or fewer.' };
  }
  return {
    ok: true,
    value: {
      clientRequestId,
      artistId,
      clientName,
      clientEmail,
      message: rawMessage || null,
      ...(designSessionId ? { designSessionId } : {}),
    },
  };
}
