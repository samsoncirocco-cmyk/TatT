"use client";

/**
 * Stripe Checkout return page (success_url) — punk StudioShell look.
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
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import type { BookingStatus } from "@/lib/booking";

/** Statuses at or past a paid deposit — safe to say "Deposit paid". */
const PAID_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  "deposit_paid",
  "confirmed",
  "completed",
]);

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting deposit",
  deposit_paid: "Deposit paid",
  confirmed: "Confirmed",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

const RECONCILE_POLL_MS = 2000;
const MAX_RECONCILE_ATTEMPTS = 10;

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
  const isDemo = sp.get("demo") === "true";

  // Server truth, once reconciled. `null` = not yet loaded / unavailable.
  const [server, setServer] = useState<ServerBooking | null>(null);

  useEffect(() => {
    // Without a bookingId there is no safe way to identify this checkout's
    // booking; do not borrow status from an unrelated recent booking.
    if (!bookingId) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const loadBooking = async (headers: Record<string, string>, attempt = 1) => {
      let shouldRetry = false;
      try {
        const res = await fetch(`/api/v1/bookings/${encodeURIComponent(bookingId)}`, { headers });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled && data?.success && data.booking) {
            const booking = data.booking as ServerBooking;
            setServer(booking);
            shouldRetry = !booking.status || booking.status === "pending";
          }
        } else {
          shouldRetry = res.status === 429 || res.status >= 500;
        }
      } catch {
        // Retry transient network / backend failures while this page is open.
        shouldRetry = true;
      }

      if (!cancelled && shouldRetry && attempt < MAX_RECONCILE_ATTEMPTS) {
        retryTimer = setTimeout(
          () => void loadBooking(headers, attempt + 1),
          RECONCILE_POLL_MS,
        );
      }
    };

    (async () => {
      let headers: Record<string, string>;
      try {
        headers = await getApiAuthHeaders();
      } catch {
        return; // signed out — keep the param-based display
      }
      await loadBooking(headers);
    })();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [bookingId]);

  const serverStatus = server?.status;
  // Demo checkout has no Stripe webhook to advance the persisted booking.
  // Otherwise trust server truth and only retain the fallback for legacy redirects.
  const isPaid = isDemo
    ? Boolean(deposit)
    : serverStatus
      ? PAID_STATUSES.has(serverStatus)
      : !bookingId && Boolean(deposit);
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
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Booking</span>
          <span>{isPaid ? "Deposit" : "Status"}&nbsp;<span className="text-pink">{isPaid ? "paid" : (statusText ?? "pending")}</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <SlashHeadline before={isPaid ? "Deposit" : "Booking"} slashed={isPaid ? "down" : "in"} size="section" />

          <div className="mt-12 border-2 hairline p-8 md:p-12">
            {depositValue && (
              <div className="sticker inline-block px-5 py-3 -rotate-2">
                <div className="font-display text-[18px] tracking-widest leading-none tabular-nums">
                  ${depositValue}
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-1">
                  {isPaid ? "Deposit paid" : "Deposit due"}
                </div>
              </div>
            )}

            {statusText && (
              <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-pink font-body">
                {statusText}
              </p>
            )}

            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-[13px] font-body max-w-2xl">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-[9px] uppercase tracking-[0.22em] text-white/40">
                    {r.label}
                  </dt>
                  <dd className="mt-1 text-white capitalize">{r.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-white/50 font-body leading-[1.9] max-w-xl">
              {isPaid ? (
                <>
                  Your requested time goes to the artist — they confirm the final slot.
                  <br />
                  Balance settles at the shop.
                </>
              ) : (
                <>
                  We&apos;re confirming your deposit with Stripe. This page updates
                  once it clears — you can also check{" "}
                  <span className="text-white">Your bookings</span>.
                </>
              )}
            </p>

            {sessionId && (
              <p className="mt-6 text-[9px] uppercase tracking-[0.15em] text-white/30 font-body break-all">
                Stripe session: {sessionId}
              </p>
            )}

            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <TapeCTA href="/bookings" size="md">Your bookings</TapeCTA>
              <TapeCTA href="/artists" variant="ghost" size="sm">Back to the roster</TapeCTA>
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
