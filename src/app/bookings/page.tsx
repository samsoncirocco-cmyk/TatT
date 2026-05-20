"use client";

import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import { useBookings, useDesigns, type TattBooking } from "@/lib/tattStorage";

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

export default function BookingsPage() {
  const { bookings, hydrated, removeBooking } = useBookings();
  const { designs } = useDesigns();
  const showEmpty = hydrated && bookings.length === 0;

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
            <span className="text-pink">{hydrated ? bookings.length : "—"}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <h1 className="font-display text-white text-[48px] md:text-[80px] leading-[0.88] tracking-[0.005em]">
              Chair&nbsp;<span className="slash"><span>time</span></span>
              <span className="text-pink">.</span>
            </h1>
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
