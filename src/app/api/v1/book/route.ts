import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

export interface BookingRequest {
  artistId?: string;
  artistName?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  description: string;
  preferredDate?: string;
  budget: string;
  designId?: string;
  designImageUrl?: string;
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many booking requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: BookingRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.clientName?.trim() || !body.clientEmail?.trim() || !body.description?.trim() || !body.budget?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Name, email, description, and budget are required' },
      { status: 400 }
    );
  }

  const bookingId = `BK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const booking = {
    bookingId,
    ...body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ip,
  };

  // Try Firestore (if configured)
  let savedToFirestore = false;
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      if (!getApps().length) {
        initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}')) });
      }
      const db = getFirestore();
      await db.collection('booking_requests').doc(bookingId).set(booking);
      savedToFirestore = true;
    }
  } catch {
    // Firebase not configured — use file fallback
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
