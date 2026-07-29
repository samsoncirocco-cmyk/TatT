"use client";

/**
 * Stripe Checkout return page (success_url) — quiet-dark StudioShell look
 * (ADR-0032): this is a money surface, so the volume stays down.
 *
 * The Stripe redirect params tell us what the client *asked* for, but a
 * redirect alone doesn't prove the deposit cleared. So after mount we
 * reconcile against server truth via the owner-scoped read API and prefer
 * the persisted status/depositAmount/paidAt over the URL params. If that
 * fetch can't run (signed out, offline, backend unconfigured) we fall back
 * to the param-based display — never blank, never invent a paid deposit.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import QuietHeadline from "@/components/quiet/QuietHeadline";
import QuietCTA from "@/components/quiet/QuietCTA";
import ReceiptCard from "@/components/quiet/ReceiptCard";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import type { BookingStatus } from "@/lib/booking";
import { bookingMoneyCopy } from "@/lib/money-copy";

/** Statuses at or past a paid deposit — safe to say "Deposit paid". */
const PAID_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  "deposit_paid",
  "confirmed",
  "completed",
]);

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting deposit",
  held: "Slot held — finish payment",
  deposit_paid: "Deposit paid",
  confirmed: "Confirmed",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

type ServerBooking = {
  status?: BookingStatus;
  depositAmount?: number | string;
  paidAt?: string;
  artistName?: string;
};

function prettyDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function SuccessContent() {
  const sp = useSearchParams();
  const artist = sp.get("artist");
  const size = sp.get("size");
  const placement = sp.get("placement");
  const date = prettyDate(sp.get("date"));
  const time = sp.get("time");
  const deposit = sp.get("deposit");
  const sessionId = sp.get("session_id");
  const bookingId = sp.get("bookingId");

  // Server truth, once reconciled. `null` = not yet loaded / unavailable.
  const [server, setServer] = useState<ServerBooking | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let headers: Record<string, string>;
      try {
        headers = await getApiAuthHeaders();
      } catch {
        return; // signed out — keep the param-based display
      }
      try {
        // Prefer a specific bookingId when the redirect carries one; otherwise
        // fall back to the caller's most-recent booking.
        const url = bookingId
          ? `/api/v1/bookings/${encodeURIComponent(bookingId)}`
          : `/api/v1/bookings`;
        const res = await fetch(url, { headers });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data?.success) return;
        const booking: ServerBooking | undefined = bookingId
          ? data.booking
          : Array.isArray(data.bookings)
            ? data.bookings[0]
            : undefined;
        if (booking) setServer(booking);
      } catch {
        // Network / backend error — degrade to param-based display.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const serverStatus = server?.status;
  // Whether to present this as a paid deposit. When we have server truth we
  // trust it exactly; without it we fall back to "Stripe redirected + a deposit
  // param is present" (the historical, optimistic behavior).
  const isPaid = serverStatus ? PAID_STATUSES.has(serverStatus) : Boolean(deposit);
  const statusText = serverStatus ? STATUS_LABELS[serverStatus] : isPaid ? "Deposit paid" : null;
  const depositValue = server?.depositAmount != null ? String(server.depositAmount) : deposit;

  const rows: { label: string; value: string }[] = [
    { label: "Artist", value: server?.artistName ?? artist ?? "To be confirmed" },
    { label: "Requested date", value: date ?? "To be confirmed" },
    { label: "Time", value: time ?? "To be confirmed" },
    {
      label: "Piece",
      value: size || placement ? [size, placement].filter(Boolean).join(" · ") : "To be confirmed",
    },
  ];

  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Booking</span>
          <span>{isPaid ? "Deposit paid" : `Status — ${statusText ?? "pending"}`}</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <QuietHeadline>{isPaid ? "Deposit paid" : "Booking received"}</QuietHeadline>

          <div className="mt-16 border hairline-quiet p-8 md:p-14">
            {statusText && (
              <p className="text-[13px] text-quiet font-body">
                {statusText}
              </p>
            )}

            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7 text-[13px] font-body max-w-2xl">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-[11px] text-quiet-dim">
                    {r.label}
                  </dt>
                  <dd className="mt-1.5 text-quiet capitalize">{r.value}</dd>
                </div>
              ))}
            </dl>

            {/* The final money summary — the one light receipt card the quiet
                register allows (ADR-0032). */}
            <div className="mt-10">
              {depositValue ? (
                <ReceiptCard className="max-w-xl">
                  <div className="flex items-baseline justify-between gap-6">
                    <div className="font-display-quiet text-[28px] leading-none tabular-nums">
                      ${depositValue}
                    </div>
                    <div className="font-body text-[12px] text-black/60">
                      {isPaid ? "Deposit paid" : "Deposit due"}
                    </div>
                  </div>
                  <p className="mt-5 pt-5 border-t border-black/15 text-[13px] font-body text-black/80 leading-[1.7]">
                    {isPaid ? (
                      <>
                        {/* The money sentence (ADR-0036): who pays what, who keeps what. */}
                        {bookingMoneyCopy.bookingSuccess}
                        <br />
                        Your requested time goes to the artist — they confirm the
                        final slot. Balance settles at the shop.
                      </>
                    ) : (
                      <>
                        We&apos;re confirming your deposit with Stripe. This page
                        updates once it clears — you can also check Your bookings.
                      </>
                    )}
                  </p>
                </ReceiptCard>
              ) : (
                <p className="text-[13px] text-quiet-dim font-body leading-[1.9] max-w-xl">
                  {isPaid ? (
                    <>
                      {/* The money sentence (ADR-0036): who pays what, who keeps what. */}
                      {bookingMoneyCopy.bookingSuccess}
                      <br />
                      Your requested time goes to the artist — they confirm the final slot.
                      <br />
                      Balance settles at the shop.
                    </>
                  ) : (
                    <>
                      We&apos;re confirming your deposit with Stripe. This page updates
                      once it clears — you can also check{" "}
                      <span className="text-quiet">Your bookings</span>.
                    </>
                  )}
                </p>
              )}
            </div>

            {sessionId && (
              <p className="mt-8 text-[11px] text-quiet-dim/80 font-body break-all">
                Stripe session: {sessionId}
              </p>
            )}

            <div className="mt-12 flex flex-col sm:flex-row items-start gap-5">
              <QuietCTA href="/bookings" size="md">Your bookings</QuietCTA>
              <QuietCTA href="/artists" variant="ghost" size="sm">Back to the roster</QuietCTA>
              <QuietCTA href="/design" variant="ghost" size="sm">Start another design</QuietCTA>
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SuccessContent />
    </Suspense>
  );
}
