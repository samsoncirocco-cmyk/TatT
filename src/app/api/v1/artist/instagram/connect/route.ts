import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/api-auth";
import { verifyFirebaseToken } from "@/lib/auth-dal";
import { ensureAdminApp } from "@/lib/firebase-admin";
import { normalizeInstagramHandle } from "@/lib/artist-claim";
import { isArtistOwner } from "@/lib/artist-ownership";
import {
  buildInstagramAuthorizeUrl,
  instagramOAuthConfig,
} from "@/lib/artist-instagram";
import {
  disconnectInstagramConnection,
  getInstagramConnection,
} from "@/lib/artist-instagram-connection";
import { replaceArtistPortfolioPosts } from "@/lib/artist-portfolio-posts";

export const runtime = "nodejs";
export const INSTAGRAM_OAUTH_STATE_COLLECTION = "instagram_oauth_states";
const STATE_TTL_MS = 10 * 60 * 1000;

function baseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function expectedInstagramHandle(artistId: string): Promise<string | null> {
  const { executeServerCypherQuery } = await import(
    "@/features/match-pulse/services/neo4jService"
  );
  const rows = await executeServerCypherQuery(
    `MATCH (a:Artist {id: $artistId})
     RETURN a.instagram AS instagram
     LIMIT 1`,
    { artistId },
  );
  return normalizeInstagramHandle(rows[0]?.instagram);
}

async function ownedArtist(req: NextRequest, artistId: string) {
  const user = await verifyFirebaseToken(req);
  const owns = await isArtistOwner(user?.uid, artistId);
  return owns && user?.uid ? user : null;
}

export async function GET(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;
  const artistId = req.nextUrl.searchParams.get("artistId") ?? "";
  if (!(await ownedArtist(req, artistId))) {
    return NextResponse.json({ error: "Not your artist profile." }, { status: 403 });
  }
  const connection = await getInstagramConnection(artistId);
  return NextResponse.json({
    configured: Boolean(instagramOAuthConfig(baseUrl(req))),
    connected: Boolean(connection),
    connection,
  });
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;
  let body: { artistId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const artistId = body.artistId ?? "";
  const user = await ownedArtist(req, artistId);
  if (!user) {
    return NextResponse.json({ error: "Not your artist profile." }, { status: 403 });
  }
  const expectedUsername = await expectedInstagramHandle(artistId);
  if (!expectedUsername) {
    return NextResponse.json(
      { error: "This profile has no Instagram identity to verify." },
      { status: 409 },
    );
  }
  const config = instagramOAuthConfig(baseUrl(req));
  if (!config || !ensureAdminApp()) {
    return NextResponse.json(
      { error: "Instagram connection is not configured on this deployment." },
      { status: 503 },
    );
  }
  const state = randomUUID();
  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    await getFirestore()
      .collection(INSTAGRAM_OAUTH_STATE_COLLECTION)
      .doc(state)
      .set({
        artistId,
        uid: user.uid,
        expectedUsername,
        redirectUri: config.redirectUri,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
        used: false,
      });
  } catch (err) {
    console.error("[instagram/connect] state persistence failed:", err);
    return NextResponse.json(
      { error: "Instagram connection is temporarily unavailable." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    authorizeUrl: buildInstagramAuthorizeUrl({ ...config, state }),
  });
}

export async function DELETE(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;
  let body: { artistId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const artistId = body.artistId ?? "";
  const user = await ownedArtist(req, artistId);
  if (!user) {
    return NextResponse.json({ error: "Not your artist profile." }, { status: 403 });
  }
  // Disconnect is also withdrawal of this display authorization. Deactivate
  // the selected posts before discarding the credential needed to reselect.
  try {
    await replaceArtistPortfolioPosts({ artistId, uid: user.uid, media: [] });
  } catch (err) {
    console.error("[instagram/connect] could not withdraw portfolio:", err);
    return NextResponse.json(
      { error: "Could not withdraw the Instagram portfolio." },
      { status: 503 },
    );
  }
  const disconnected = await disconnectInstagramConnection(artistId);
  return disconnected
    ? NextResponse.json({ disconnected: true })
    : NextResponse.json({ error: "Could not disconnect Instagram." }, { status: 503 });
}
