"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useBookings, useDesigns, type TattBooking } from "@/lib/tattStorage";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import type { BookingStatus } from "@/lib/booking";
import { bookingMoneyCopy } from "@/lib/money-copy";

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
    <div className="border-2 hairline p-6 md:p-8 relative">
      <div className="flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <div className="font-display text-white text-[32px] sm:text-[40px] leading-none tracking-tight">
            {serverDisplayDate(b)}
            <span className="text-pink">.</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 font-body">
            <span>
              Artist:&nbsp;<span className="text-white">{b.artistName ?? "TBC"}</span>
            </span>
            <span className="text-pink">●</span>
            <span>
              Ref:&nbsp;<span className="text-white">{b.bookingId ?? b.id}</span>
            </span>
            {b.depositAmount != null && (
              <>
                <span className="text-pink">●</span>
                <span>
                  Deposit:&nbsp;<span className="text-pink">${String(b.depositAmount)}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="sticker inline-block px-3 py-1">
          <div className="font-display text-[14px] tracking-widest leading-none">
            {statusLabel(b.status)}
          </div>
          <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5">
            {active ? "Studio Hold" : "Request"}
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
    <div className="border-2 hairline p-6 md:p-8 relative group">
      <div className="flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <div className="font-display text-white text-[32px] sm:text-[40px] leading-none tracking-tight">
            {formatBookingDate(b.date)}
            <span className="text-pink">.</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 font-body">
            <span>Design:&nbsp;<span className="text-white">{designLabel}</span></span>
            <span className="text-pink">●</span>
            <span>
              Deposit:&nbsp;
              <span className="text-pink">
                {b.depositPaid ? "Paid" : "Pending"}
              </span>
            </span>
          </div>
        </div>
        <div className="sticker inline-block px-3 py-1">
          <div className="font-display text-[14px] tracking-widest leading-none">
            Confirmed
          </div>
          <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5">
            Studio&nbsp;Hold
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm("Cancel this booking?")) onRemove();
        }}
        aria-label="Cancel booking"
        className="absolute top-3 right-3 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink border hairline opacity-0 group-hover:opacity-100 transition-opacity press font-body"
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
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Bookings
          </span>
          <span>
            Holds:&nbsp;
            <span className="text-pink">{ready ? count : "—"}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <SlashHeadline
              before="Chair"
              slashed="time"
              size="section"
            />
            <Link
              href="/book"
              className="tape press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em]"
            >
              New Booking
              <span className="ml-2 text-[14px]">▸</span>
            </Link>
          </div>

          {/* The money sentence (ADR-0036): who pays what, who keeps what. */}
          <p className="mt-4 font-body text-[12px] text-white/50 leading-[1.6]">
            {bookingMoneyCopy.bookingsList}
          </p>

          {showEmpty ? (
            <div className="mt-20 border-2 hairline py-24 px-6 text-center">
              <div className="font-display text-[40px] sm:text-[56px] leading-[0.95] text-white">
                <span className="scribble text-pink">No bookings yet.</span>
              </div>
              <p className="mt-4 text-[12px] uppercase tracking-[0.2em] text-white/50 font-body">
                The chair&apos;s open.
              </p>
              <Link
                href="/book"
                className="mt-10 tape press inline-flex items-center justify-center px-8 py-4 font-display text-[24px] leading-none tracking-[0.02em]"
              >
                Book the Chair
                <span className="ml-3 text-[18px]">▸</span>
              </Link>
            </div>
          ) : useServer ? (
            <div className="mt-12 space-y-4">
              {server.map((b) => (
                <ServerBookingCard key={b.id} b={b} />
              ))}
            </div>
          ) : (
            <div className="mt-12 space-y-4">
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
