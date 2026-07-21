/**
 * Server-side artist availability accessor (firebase-admin only —
 * never import from client components).
 *
 * Model: one Firestore doc per artist at artist_availability/{artistId},
 * written by ops/artists (no client writes — see firestore.rules).
 * Missing doc, unconfigured admin creds, or any read error all resolve
 * to the honest default: status "unknown", which the UI renders as
 * "availability on request". No fake green dots anywhere.
 */
import { ensureAdminApp } from "./firebase-admin";
import {
  type ArtistAvailability,
  defaultAvailability,
  normalizeAvailability,
} from "./booking";

export async function getArtistAvailability(
  artistId: string,
): Promise<ArtistAvailability> {
  try {
    if (!ensureAdminApp()) return defaultAvailability(artistId);
    const { getFirestore } = await import("firebase-admin/firestore");
    const snap = await getFirestore()
      .collection("artist_availability")
      .doc(artistId)
      .get();
    return normalizeAvailability(artistId, snap.exists ? snap.data() : null);
  } catch {
    return defaultAvailability(artistId);
  }
}
