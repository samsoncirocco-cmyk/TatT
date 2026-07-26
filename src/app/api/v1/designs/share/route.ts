import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import {
  resolveSharedDesignStore,
  SHARE_STORE_UNAVAILABLE,
  type SharedDesign,
} from '@/lib/shared-design-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/designs/share — mint a durable share link.
 *
 * Persistence lives in @/lib/shared-design-store (issue #64). If no durable
 * store is available we return 503 instead of a shareId: a link that only
 * exists in one instance's memory is a broken promise, not a share.
 */
export async function POST(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  let body: { imageUrl: string; prompt: string; style?: string; bodyPart?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.imageUrl || !body.prompt) {
    return NextResponse.json({ success: false, error: 'imageUrl and prompt are required' }, { status: 400 });
  }

  const store = resolveSharedDesignStore();
  if (!store) {
    console.error('[share] no durable store configured — refusing to mint a link that cannot be read');
    return NextResponse.json(SHARE_STORE_UNAVAILABLE, { status: 503 });
  }

  // Owner uid — provenance only; stripped before the share is served.
  // verifyApiAuth already accepted the token, so this is the same user.
  const user = await verifyFirebaseToken(request);

  const shareId = randomUUID().slice(0, 10);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tatt-app.vercel.app';
  const design: SharedDesign = {
    shareId,
    imageUrl: body.imageUrl,
    prompt: body.prompt,
    style: body.style,
    bodyPart: body.bodyPart,
    uid: user?.uid ?? null,
    generatedAt: new Date().toISOString(),
    sharedAt: new Date().toISOString(),
    shareUrl: `${baseUrl}/share/${shareId}`,
    views: 0,
  };

  try {
    await store.save(design);
  } catch (err) {
    console.error(
      `[share] ${shareId}: persist failed — no link issued:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(SHARE_STORE_UNAVAILABLE, { status: 503 });
  }

  return NextResponse.json({ success: true, shareId, shareUrl: design.shareUrl });
}
