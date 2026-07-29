import { NextRequest, NextResponse } from "next/server";
import { ensureAdminApp } from "@/lib/firebase-admin";
import { normalizeInstagramHandle } from "@/lib/artist-claim";
import {
  exchangeForLongLivedInstagramToken,
  exchangeInstagramCode,
  fetchInstagramProfile,
  instagramOAuthConfig,
} from "@/lib/artist-instagram";
import { saveInstagramConnection } from "@/lib/artist-instagram-connection";
import { markInstagramOAuthVerified } from "@/lib/artist-portfolio-posts";
import { INSTAGRAM_OAUTH_STATE_COLLECTION } from "../connect/route";

export const runtime = "nodejs";

function baseUrl(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "");
}

function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/artist/profile", baseUrl(req));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (req.nextUrl.searchParams.get("error")) {
    return back(req, { instagram: "cancelled" });
  }
  if (!state || !code) {
    return back(req, { instagram: "error", reason: "missing_params" });
  }
  if (!ensureAdminApp()) {
    return back(req, { instagram: "error", reason: "unavailable" });
  }
  const { getFirestore } = await import("firebase-admin/firestore");
  const db = getFirestore();
  const stateRef = db.collection(INSTAGRAM_OAUTH_STATE_COLLECTION).doc(state);
  let stored: {
    artistId: string;
    uid: string;
    expectedUsername: string;
    expiresAt?: string;
    used?: boolean;
  } | null = null;
  try {
    stored = await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      if (!snap.exists) return null;
      const doc = snap.data() as NonNullable<typeof stored>;
      if (doc.used || (doc.expiresAt && Date.parse(doc.expiresAt) < Date.now())) {
        return null;
      }
      tx.update(stateRef, { used: true, usedAt: new Date().toISOString() });
      return doc;
    });
  } catch (err) {
    console.error("[instagram/callback] state lookup failed:", err);
    return back(req, { instagram: "error", reason: "unavailable" });
  }
  if (!stored?.artistId || !stored.uid) {
    return back(req, { instagram: "error", reason: "bad_state" });
  }
  const config = instagramOAuthConfig(baseUrl(req));
  if (!config) return back(req, { instagram: "error", reason: "not_configured" });

  try {
    const short = await exchangeInstagramCode({ config, code });
    if (!short.ok) return back(req, { instagram: "error", reason: short.reason });
    const long = await exchangeForLongLivedInstagramToken({
      config,
      accessToken: short.accessToken,
    });
    if (!long.ok) return back(req, { instagram: "error", reason: long.reason });
    const profile = await fetchInstagramProfile({ accessToken: long.accessToken });
    if (!profile) return back(req, { instagram: "error", reason: "profile_lookup" });
    if (
      normalizeInstagramHandle(profile.username) !==
      normalizeInstagramHandle(stored.expectedUsername)
    ) {
      return back(req, { instagram: "error", reason: "account_mismatch" });
    }
    const saved = await saveInstagramConnection({
      artistId: stored.artistId,
      profile,
      accessToken: long.accessToken,
      expiresInSeconds: long.expiresInSeconds,
    });
    if (!saved.ok) return back(req, { instagram: "error", reason: saved.reason });
    const marked = await markInstagramOAuthVerified({
      artistId: stored.artistId,
      uid: stored.uid,
      instagramUserId: profile.userId,
      username: profile.username,
    });
    if (!marked) {
      return back(req, { instagram: "error", reason: "ownership_changed" });
    }
    return back(req, { instagram: "connected" });
  } catch (err) {
    console.error("[instagram/callback] provider request failed:", err);
    return back(req, { instagram: "error", reason: "provider_unavailable" });
  }
}
