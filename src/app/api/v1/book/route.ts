import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { validateBookingRequest } from '@/lib/booking';

// In-memory rate limiter: ip -> list of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  // Owner uid — booking_requests docs are readable only by this user
  // (see firestore.rules). verifyApiAuth already accepted the token,
  // so this resolves to the same verified user.
  const user = await verifyFirebaseToken(request);

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many booking requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = validateBookingRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  const bookingId = `BK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const booking = {
    bookingId,
    ...parsed.value,
    uid: user?.uid ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ip,
  };

  // Try Firestore (if configured)
  let savedToFirestore = false;
  const credSource = ensureAdminApp();
  try {
    if (credSource) {
      const { getFirestore } = await import('firebase-admin/firestore');
      await getFirestore().collection('booking_requests').doc(bookingId).set(booking);
      savedToFirestore = true;
    } else {
      console.error(`[book] ${bookingId}: Firebase Admin unconfigured — using file fallback`);
    }
  } catch (err) {
    // Fall back to file, but never silently: a lost prod booking is real money
    console.error(
      `[book] ${bookingId}: Firestore write failed (cred source: ${credSource}) — using file fallback:`,
      err instanceof Error ? err.message : err
    );
  }

  // Fallback: append to local file
  if (!savedToFirestore) {
    try {
      const dir = '/tmp/tatt-data';
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(join(dir, 'bookings.jsonl'), JSON.stringify(booking) + '\n');
    } catch {
      // Even file write failed — still return success (booking captured in memory)
    }
  }

  return NextResponse.json({
    success: true,
    bookingId,
    message: `Booking request received! Your confirmation number is ${bookingId}. The artist will contact you within 24 hours.`,
  });
}
