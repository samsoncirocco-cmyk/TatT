/**
 * Invoicing — create and send a hosted Stripe invoice.
 *
 * Scaffold for TatT's AR/AP: bill a customer (or an artist) for a one-off
 * amount with Stripe Tax computed automatically. Creates the customer if only
 * an email is supplied, attaches a single invoice item, then finalizes and
 * sends the hosted invoice. Returns the hosted invoice URL.
 *
 * NOTE: marketplace invoicing that routes funds to a connected artist
 * (on_behalf_of + transfer_data) is intentionally out of scope for this first
 * pass — see PR description. This creates a platform-side invoice.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED, CURRENCY } from '@/lib/stripe';

export const runtime = 'nodejs';

interface InvoicePayload {
  customerId?: string;
  email?: string;
  amount?: number; // dollars
  description?: string;
  daysUntilDue?: number;
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  if (!stripeConfigured) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  let body: InvoicePayload;
  try {
    body = (await req.json()) as InvoicePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.customerId && !body.email) {
    return NextResponse.json({ error: 'Provide customerId or email.' }, { status: 400 });
  }
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'A positive amount (in dollars) is required.' }, { status: 400 });
  }

  try {
    // 1. Resolve or create the customer.
    let customerId = body.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: body.email });
      customerId = customer.id;
    }

    // 2. Attach the line item.
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(body.amount * 100),
      currency: CURRENCY,
      description: body.description || 'TatT services',
    });

    // 3. Create the invoice (send-invoice collection, Tax on).
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: body.daysUntilDue ?? 7,
      automatic_tax: { enabled: true },
      auto_advance: true,
    });

    // 4. Finalize + send the hosted invoice.
    if (!invoice.id) {
      return NextResponse.json({ error: 'Stripe did not return an invoice id.' }, { status: 502 });
    }
    await stripe.invoices.finalizeInvoice(invoice.id);
    const sent = await stripe.invoices.sendInvoice(invoice.id);

    return NextResponse.json({
      invoiceId: sent.id,
      status: sent.status,
      hostedInvoiceUrl: sent.hosted_invoice_url,
      customerId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create invoice.';
    console.error('[Invoicing] create failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
