/**
 * Cron: expire stale held deposits.
 *
 * When a customer books an UNCLAIMED artist we collect the deposit to the
 * PLATFORM and hold it as a pending :BookingRelay. If the artist never onboards
 * within the hold window (DEPOSIT_HOLD_DAYS), the hold expires: we fully refund
 * the customer (TatT absorbs the Stripe fee) and mark the relay 'refunded'.
 *
 * This route is invoked by the Vercel cron scheduler (see vercel.json) and is
 * guarded by a shared secret rather than user auth: it must present
 * `Authorization: Bearer <CRON_SECRET>`. Vercel cron issues GET requests, so we
 * accept both GET and POST. Fails closed — if CRON_SECRET is unset or the
 * header doesn't match (constant-time), we return 401.
 */
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { listExpiredPending, refundRelay } from '@/lib/booking-relay';

export const runtime = 'nodejs';

/** Constant-time bearer-token check against CRON_SECRET. */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  const expired = await listExpiredPending(nowEpoch);

  let refunded = 0;
  for (const relay of expired) {
    try {
      // refundRelay is idempotent and flips the relay to 'refunded' on success.
      await refundRelay(relay.id);
      refunded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/expire-deposits] refund failed for relay ${relay.id}:`, message);
    }
  }

  console.log(`[cron/expire-deposits] refunded ${refunded}/${expired.length} expired holds.`);
  return NextResponse.json({ refunded });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
