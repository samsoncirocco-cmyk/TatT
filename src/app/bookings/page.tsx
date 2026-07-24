"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useBookings, useDesigns, type TattBooking } from "@/lib/tattStorage";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import type { BookingStatus, RequestedSlot } from "@/lib/booking";

/** Server-truth booking from /api/v1/bookings (webhook-reconciled status). */
type ServerBooking = {
  bookingId: string;
  artistName?: string;
  designId?: string;
  status?: BookingStatus;
  requestedSlots?: RequestedSlot[];
  createdAt?: string;
  depositCents?: number;
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Deposit pending",
  deposit_paid: "Deposit paid",
  confirmed: "Confirmed",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

function formatBookingDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[parseInt(m, 10) - 1] ?? m;
  return `${month} ${parseInt(d, 10)}, ${y}`;
}

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
          <div className="font-display text-[11px] tracking-widest leading-none">
            Confirmed
          </div>
          <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
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

function ServerBookingCard({
  b,
  designLabel,
}: {
  b: ServerBooking;
  designLabel: string;
}) {
  const date = b.requestedSlots?.[0]?.date ?? b.createdAt?.slice(0, 10) ?? "";
  const status: BookingStatus = b.status ?? "pending";
  const paid = status !== "pending" && status !== "expired" && status !== "cancelled";
  return (
    <div className="border-2 hairline p-6 md:p-8 relative">
      <div className="flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <div className="font-display text-white text-[32px] sm:text-[40px] leading-none tracking-tight">
            {date ? formatBookingDate(date) : "Date with the artist"}
            <span className="text-pink">.</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 font-body">
            {b.artistName && (
              <>
                <span>Artist:&nbsp;<span className="text-white">{b.artistName}</span></span>
                <span className="text-pink">●</span>
              </>
            )}
            <span>Design:&nbsp;<span className="text-white">{designLabel}</span></span>
            <span className="text-pink">●</span>
            <span>
              Status:&nbsp;
              <span className="text-pink">{STATUS_LABEL[status]}</span>
            </span>
          </div>
        </div>
        <div className="sticker inline-block px-3 py-1">
          <div className="font-display text-[11px] tracking-widest leading-none">
            {paid ? "Locked in" : "Awaiting deposit"}
          </div>
          <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
            {b.bookingId}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { bookings, hydrated, removeBooking } = useBookings();
  const { designs } = useDesigns();

  // Server truth wins when reachable: it knows about deposit_paid transitions
  // the localStorage mirror never learns. null = fetch failed / signed out →
  // fall back to the local mirror (previous behavior, unchanged).
  const [serverBookings, setServerBookings] = useState<ServerBooking[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getApiAuthHeaders();
        const res = await fetch("/api/v1/bookings", { headers });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(data?.bookings)) {
          setServerBookings(data.bookings as ServerBooking[]);
        }
      } catch {
        // Signed out or API unreachable — local mirror stays authoritative.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const useServer = serverBookings !== null;
  const count = useServer ? serverBookings.length : bookings.length;
  const showEmpty = useServer ? serverBookings.length === 0 : hydrated && bookings.length === 0;

  const designLabel = (id?: string) => {
    if (!id) return "No design — decide in chair";
    const d = designs.find((x) => x.id === id);
    if (!d) return "Design (deleted)";
    return d.prompt.split(/[\s,]+/).slice(0, 4).join(" ") || "Untitled cut";
  };

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Bookings
          </span>
          <span>
            Holds:&nbsp;
            <span className="text-pink">{useServer || hydrated ? count : "—"}</span>
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
              {serverBookings.map((b) => (
                <ServerBookingCard
                  key={b.bookingId}
                  b={b}
                  designLabel={designLabel(b.designId)}
                />
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
