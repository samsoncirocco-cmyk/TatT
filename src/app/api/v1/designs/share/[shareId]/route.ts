import { NextRequest, NextResponse } from 'next/server';
import {
  resolveSharedDesignStore,
  SHARE_STORE_UNAVAILABLE,
  toPublicShare,
} from '@/lib/shared-design-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/designs/share/[shareId] — public read of a shared design.
 *
 * 404 means the share genuinely does not exist. A backend that is down or
 * unconfigured returns 503, never 404: we don't tell a visitor a design is
 * gone when the truth is that we cannot look.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;

  const store = resolveSharedDesignStore();
  if (!store) {
    console.error('[share] no durable store configured — cannot resolve share links');
    return NextResponse.json(SHARE_STORE_UNAVAILABLE, { status: 503 });
  }

  let design;
  try {
    design = await store.getAndCountView(shareId);
  } catch (err) {
    console.error(
      `[share] lookup ${shareId} failed:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(SHARE_STORE_UNAVAILABLE, { status: 503 });
  }

  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Whitelist projection — the owner's uid never reaches a visitor.
  return NextResponse.json(toPublicShare(design));
}
