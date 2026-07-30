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

/**
 * Terminal states where "what happens next" would be a lie — the booking is
 * over, and the status line above already says so.
 */
const ENDED_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  "declined",
  "cancelled",
  "refunded",
  "expired",
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

type TimelineStep = { title: string; detail: string };

/**
 * The vertical what-happens-next timeline — quiet register: hairline
 * connector, warm-gray dots, no pink. The current step carries
 * aria-current="step" and the brightest text.
 */
function QuietTimeline({
  steps,
  currentIndex,
  allDone,
}: {
  steps: TimelineStep[];
  /** Index of the step in progress; steps before it are done. */
  currentIndex: number;
  /** Every step is behind us (booking completed). */
  allDone: boolean;
}) {
  return (
    <ol className="mt-7">
      {steps.map((step, i) => {
        const done = allDone || i < currentIndex;
        const current = !allDone && i === currentIndex;
        const last = i === steps.length - 1;
        return (
          <li
            key={step.title}
            aria-current={current ? "step" : undefined}
            className={`relative pl-8 ${last ? "" : "pb-8"}`}
          >
            {!last && (
              <span
                aria-hidden
                className="absolute left-[4px] top-[14px] bottom-0 w-px bg-white/15"
              />
            )}
            <span
              aria-hidden
              className={`absolute left-0 top-[5px] h-[9px] w-[9px] rounded-full ${
                current
                  ? "bg-white"
                  : done
                    ? "bg-quiet"
                    : "border hairline-quiet bg-transparent"
              }`}
            />
            <p
              className={`text-[13px] font-body ${
                current ? "text-white" : done ? "text-quiet" : "text-quiet-dim"
              }`}
            >
              {step.title}
            </p>
            <p className="mt-1 text-[12px] text-quiet-dim font-body leading-[1.7]">
              {step.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

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

  // The booking's .ics, when it has a CONCRETE slot (reservation model —
  // ADR 0027). The calendar route answers 404 for request-model bookings,
  // so a fetched file doubles as the honest discriminator between the two
  // timeline variants. `null` = request model, or truth unavailable —
  // either way we fail closed to the request framing, mirroring
  // resolveBookingMode.
  const [calendarIcs, setCalendarIcs] = useState<Blob | null>(null);

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

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    (async () => {
      let headers: Record<string, string>;
      try {
        headers = await getApiAuthHeaders();
      } catch {
        return; // signed out — request framing, no calendar file
      }
      try {
        const res = await fetch(
          `/api/v1/bookings/${encodeURIComponent(bookingId)}/calendar.ics`,
          { headers },
        );
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (!cancelled) setCalendarIcs(blob);
      } catch {
        // No calendar — the request-model timeline still stands.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const downloadCalendar = () => {
    if (!calendarIcs || !bookingId) return;
    const url = URL.createObjectURL(calendarIcs);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tatttester-booking-${bookingId.replace(/[^A-Za-z0-9_-]/g, "")}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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

  // ── What happens next ─────────────────────────────────────────────
  // Two honest variants (ADR 0027). Reservation: the deposit confirmed a
  // concrete, exclusively-held slot — nothing further to wait on before the
  // session. Request: the deposit accompanies an ask, and the artist still
  // confirms or counters — no invented response windows.
  const reserved = calendarIcs !== null;
  const artistLabel = server?.artistName ?? artist ?? "the artist";
  const whenLabel = date ? (time ? `${date} at ${time}` : date) : null;

  const timelineSteps: TimelineStep[] = reserved
    ? [
        {
          title: "Time reserved",
          detail: whenLabel
            ? `${whenLabel} — held exclusively for you while you paid.`
            : "Your chosen time was held exclusively for you while you paid.",
        },
        {
          title: "Deposit",
          detail: isPaid
            ? "Paid — and that's what confirms the slot. The time is yours."
            : "Confirming with Stripe. Once it clears, the time is yours.",
        },
        {
          title: "Your session",
          detail:
            "Balance settles at the shop. Add the time to your calendar below.",
        },
      ]
    : [
        {
          title: "Request sent",
          detail: `Your design, dates and details are with ${artistLabel}.`,
        },
        {
          title: "Deposit",
          detail: isPaid
            ? "Paid — and held against your session. If the booking doesn't go ahead, your deposit comes back in full."
            : "Confirming with Stripe. This page updates once it clears.",
        },
        {
          title: "Artist review",
          detail: `${artistLabel} confirms your time or suggests another. Response times vary — there's no set window.`,
        },
        {
          title: "Your session",
          detail: "Time settled with the artist. Balance settles at the shop.",
        },
      ];

  const timelineDone = serverStatus === "completed";
  const timelineCurrent = reserved
    ? serverStatus === "deposit_paid" || serverStatus === "confirmed"
      ? 2
      : isPaid
        ? 2
        : 1
    : serverStatus === "confirmed"
      ? 3
      : serverStatus === "deposit_paid" || (!serverStatus && isPaid)
        ? 2
        : 1;
  const showTimeline = !serverStatus || !ENDED_STATUSES.has(serverStatus);

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
                        {reserved ? (
                          <>Your time is booked. Balance settles at the shop.</>
                        ) : (
                          <>
                            Your requested time goes to the artist — they confirm
                            the final slot. Balance settles at the shop.
                          </>
                        )}
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

            {showTimeline && (
              <div className="mt-14 max-w-xl">
                <h2 className="text-[11px] text-quiet-dim font-body">
                  What happens next
                </h2>
                <QuietTimeline
                  steps={timelineSteps}
                  currentIndex={timelineCurrent}
                  allDone={timelineDone}
                />
                {calendarIcs && (
                  <div className="mt-7 pl-8">
                    <QuietCTA onClick={downloadCalendar} variant="ghost" size="sm">
                      Add to calendar (.ics)
                    </QuietCTA>
                  </div>
                )}
              </div>
            )}

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
