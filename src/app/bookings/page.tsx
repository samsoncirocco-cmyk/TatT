"use client";

import { useEffect, useState } from "react";
import StudioShell from "@/components/studio/StudioShell";
import QuietHeadline from "@/components/quiet/QuietHeadline";
import QuietCTA from "@/components/quiet/QuietCTA";
import { useBookings, useDesigns, type TattBooking } from "@/lib/tattStorage";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import type { BookingStatus } from "@/lib/booking";

function formatBookingDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[parseInt(m, 10) - 1] ?? m;
  return `${month} ${parseInt(d, 10)}, ${y}`;
}

// ─── Server truth ──────────────────────────────────────────────────────

type RequestedSlot = { date: string; time?: string };
type ServerBooking = {
  id: string;
  bookingId?: string;
  artistName?: string;
  status?: BookingStatus;
  depositAmount?: number | string;
  requestedSlots?: RequestedSlot[];
  createdAt?: string;
};

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

/** Statuses that read as "live / holding the chair". */
const ACTIVE_STATUSES = new Set<BookingStatus>(["deposit_paid", "confirmed", "completed"]);

function statusLabel(status?: BookingStatus): string {
  return status ? STATUS_LABELS[status] : "Awaiting deposit";
}

function serverDisplayDate(b: ServerBooking): string {
  const slot = b.requestedSlots?.find((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date));
  if (slot) return formatBookingDate(slot.date);
  if (b.createdAt) {
    const d = new Date(b.createdAt);
    if (!Number.isNaN(d.getTime())) return formatBookingDate(d.toISOString().slice(0, 10));
  }
  return "Date on request";
}

function ServerBookingCard({ b }: { b: ServerBooking }) {
  const active = ACTIVE_STATUSES.has(b.status ?? "pending");
  return (
    <div className="border hairline-quiet p-8 md:p-10 relative">
      <div className="flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <div className="font-display-quiet text-quiet text-[24px] sm:text-[28px] leading-none">
            {serverDisplayDate(b)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-quiet-dim font-body">
            <span>
              Artist:&nbsp;<span className="text-quiet">{b.artistName ?? "TBC"}</span>
            </span>
            <span>·</span>
            <span>
              Ref:&nbsp;<span className="text-quiet">{b.bookingId ?? b.id}</span>
            </span>
            {b.depositAmount != null && (
              <>
                <span>·</span>
                <span>
                  Deposit:&nbsp;<span className="text-quiet">${String(b.depositAmount)}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="inline-block border hairline-quiet px-3 py-2">
          <div className="font-display-quiet text-quiet text-[13px] leading-none">
            {statusLabel(b.status)}
          </div>
          <div className="font-body text-[10px] text-quiet-dim leading-none mt-1">
            {active ? "Studio hold" : "Request"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Local fallback card (unchanged behavior) ──────────────────────────

function BookingCard({
  b,
  designLabel,
  onRemove,
}: {
  b: TattBooking;
  designLabel: string;
  onRemove: () => void;
}) {
  return (
    <div className="border hairline-quiet p-8 md:p-10 relative group">
      <div className="flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <div className="font-display-quiet text-quiet text-[24px] sm:text-[28px] leading-none">
            {formatBookingDate(b.date)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-quiet-dim font-body">
            <span>Design:&nbsp;<span className="text-quiet">{designLabel}</span></span>
            <span>·</span>
            <span>
              Deposit:&nbsp;
              <span className="text-quiet">
                {b.depositPaid ? "Paid" : "Pending"}
              </span>
            </span>
          </div>
        </div>
        <div className="inline-block border hairline-quiet px-3 py-2">
          <div className="font-display-quiet text-quiet text-[13px] leading-none">
            Confirmed
          </div>
          <div className="font-body text-[10px] text-quiet-dim leading-none mt-1">
            Studio hold
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm("Cancel this booking?")) onRemove();
        }}
        aria-label="Cancel booking"
        className="absolute top-3 right-3 px-3 py-1.5 text-[11px] text-quiet-dim hover:text-white border hairline-quiet-soft opacity-0 group-hover:opacity-100 transition-opacity press font-body"
      >
        Cancel
      </button>
    </div>
  );
}

export default function BookingsPage() {
  const { bookings, hydrated, removeBooking } = useBookings();
  const { designs } = useDesigns();

  // Server truth. `null` = not resolved yet; then either an array (server view)
  // or we fall back to the localStorage view on auth/network failure.
  const [server, setServer] = useState<ServerBooking[] | null>(null);
  const [serverResolved, setServerResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let headers: Record<string, string>;
      try {
        headers = await getApiAuthHeaders();
      } catch {
        if (!cancelled) setServerResolved(true); // signed out → local fallback
        return;
      }
      try {
        const res = await fetch("/api/v1/bookings", { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (data?.success && Array.isArray(data.bookings)) {
          setServer(data.bookings as ServerBooking[]);
        }
      } catch {
        // Leave `server` null → local fallback below.
      } finally {
        if (!cancelled) setServerResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const designLabel = (id?: string) => {
    if (!id) return "No design — decide in chair";
    const d = designs.find((x) => x.id === id);
    if (!d) return "Design (deleted)";
    return d.prompt.split(/[\s,]+/).slice(0, 4).join(" ") || "Untitled cut";
  };

  // Which view are we showing? Server truth wins once we have it AND it has rows.
  // But an EMPTY server list must not suppress a just-created localStorage row
  // (the booking was mirrored via addBooking and may not have propagated to the
  // Firestore query yet) — fall back to local in that case. A failed fetch leaves
  // `server` null (see the effect) and also falls back.
  const useServer = server !== null && (server.length > 0 || bookings.length === 0);
  const count = useServer ? server.length : bookings.length;
  const ready = useServer ? true : hydrated && serverResolved;
  const showEmpty = ready && count === 0;

  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Bookings</span>
          <span>Holds: {ready ? count : "—"}</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <QuietHeadline>Chair time</QuietHeadline>
            <QuietCTA href="/book" size="md">New booking</QuietCTA>
          </div>

          {/* The money sentence (ADR-0033): who pays what, who keeps what. */}
          <p className="mt-6 font-body text-[14px] text-quiet leading-[1.7] max-w-xl">
            Every deposit goes to your artist in full — the booking fee you pay at
            checkout is the only part we keep.
          </p>

          {showEmpty ? (
            <div className="mt-24 border hairline-quiet py-28 px-6 text-center">
              <div className="font-display-quiet text-[26px] sm:text-[32px] leading-[1.1] text-quiet">
                No bookings yet.
              </div>
              <p className="mt-5 text-[13px] text-quiet-dim font-body">
                The chair&apos;s open.
              </p>
              <div className="mt-12">
                <QuietCTA href="/book" size="lg">Book the chair</QuietCTA>
              </div>
            </div>
          ) : useServer ? (
            <div className="mt-16 space-y-6">
              {server.map((b) => (
                <ServerBookingCard key={b.id} b={b} />
              ))}
            </div>
          ) : (
            <div className="mt-16 space-y-6">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  designLabel={designLabel(b.designId)}
                  onRemove={() => removeBooking(b.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
