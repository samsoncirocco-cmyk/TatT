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
 * The vote tally (TAT-52) rides along in the response; there is no separate
 * tally endpoint.
 *
 * `?peek=1` reads without counting a view — for the owner checking their own
 * tally from /designs/[id]. Their glance at the verdict is not a visitor,
 * and letting it bump "Views" would quietly falsify the stat the share page
 * shows to actual strangers.
 *
 * 404 means the share genuinely does not exist. A backend that is down or
 * unconfigured returns 503, never 404: we don't tell a visitor a design is
 * gone when the truth is that we cannot look.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const peek = request.nextUrl.searchParams.get('peek') === '1';

  const store = resolveSharedDesignStore();
  if (!store) {
    console.error('[share] no durable store configured — cannot resolve share links');
    return NextResponse.json(SHARE_STORE_UNAVAILABLE, { status: 503 });
  }

  let design;
  try {
    design = peek ? await store.get(shareId) : await store.getAndCountView(shareId);
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
