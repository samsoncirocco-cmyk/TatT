import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const config = { api: { bodyParser: false } };

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      amount_total?: number;
      customer_email?: string;
      payment_status?: string;
      metadata?: Record<string, string>;
    };
  };
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, webhookSecret: string): boolean {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signature = parts.find((part) => part.startsWith('v1='))?.slice(3);

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const placeholderMode = !webhookSecret || webhookSecret.startsWith('whsec_PLACEHOLDER');

    if (!placeholderMode) {
      const signatureHeader = req.headers.get('stripe-signature');
      if (!signatureHeader || !verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody) as StripeWebhookEvent;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[Stripe Webhook] Booking completed:', {
        eventId: event.id,
        sessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        customerEmail: session.customer_email,
        metadata: session.metadata || {},
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
