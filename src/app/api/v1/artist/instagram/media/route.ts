import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/api-auth";
import { verifyFirebaseToken } from "@/lib/auth-dal";
import { isArtistOwner } from "@/lib/artist-ownership";
import { fetchInstagramMedia } from "@/lib/artist-instagram";
import {
  getInstagramAccessToken,
  getInstagramConnection,
} from "@/lib/artist-instagram-connection";
import {
  getArtistPortfolioPosts,
  replaceArtistPortfolioPosts,
  selectOwnedInstagramMedia,
} from "@/lib/artist-portfolio-posts";

export const runtime = "nodejs";
const PORTFOLIO_LIMIT = 8;

async function owner(req: NextRequest, artistId: string) {
  const user = await verifyFirebaseToken(req);
  return user?.uid && (await isArtistOwner(user.uid, artistId)) ? user : null;
}

async function availableMedia(artistId: string) {
  try {
    const token = await getInstagramAccessToken(artistId);
    if (!token.ok) return { ok: false as const, reason: token.reason };
    const media = await fetchInstagramMedia({ accessToken: token.accessToken, limit: 50 });
    if (!media) return { ok: false as const, reason: "media_lookup_failed" };
    return { ok: true as const, media };
  } catch (err) {
    console.error("[instagram/media] connection refresh failed:", err);
    return { ok: false as const, reason: "connection_unavailable" };
  }
}

export async function GET(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;
  const artistId = req.nextUrl.searchParams.get("artistId") ?? "";
  if (!(await owner(req, artistId))) {
    return NextResponse.json({ error: "Not your artist profile." }, { status: 403 });
  }
  const connection = await getInstagramConnection(artistId);
  if (!connection) return NextResponse.json({ connected: false, media: [] });
  const available = await availableMedia(artistId);
  if (!available.ok) {
    return NextResponse.json(
      { error: "Could not refresh Instagram media.", reason: available.reason },
      { status: 503 },
    );
  }
  const selected = await getArtistPortfolioPosts(artistId);
  return NextResponse.json({
    connected: true,
    username: connection.username,
    media: available.media,
    selectedIds: selected.map((post) => post.sourceId),
    maxSelected: PORTFOLIO_LIMIT,
  });
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;
  let body: { artistId?: string; mediaIds?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const artistId = body.artistId ?? "";
  const user = await owner(req, artistId);
  if (!user) {
    return NextResponse.json({ error: "Not your artist profile." }, { status: 403 });
  }
  const available = await availableMedia(artistId);
  if (!available.ok) {
    return NextResponse.json(
      { error: "Could not verify the selected Instagram posts." },
      { status: 503 },
    );
  }
  const selection = selectOwnedInstagramMedia(
    available.media,
    body.mediaIds,
    PORTFOLIO_LIMIT,
  );
  if (!selection.ok) {
    return NextResponse.json({ error: selection.error }, { status: 400 });
  }
  try {
    const posts = await replaceArtistPortfolioPosts({
      artistId,
      uid: user.uid,
      media: selection.selected,
    });
    return NextResponse.json({ saved: true, posts });
  } catch (err) {
    console.error("[instagram/media] portfolio save failed:", err);
    return NextResponse.json({ error: "Could not save your portfolio." }, { status: 503 });
  }
}
