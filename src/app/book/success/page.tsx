"use client";

/**
 * Stripe Checkout return page (success_url) — punk StudioShell look.
 * Everything shown comes from the checkout session's redirect params;
 * anything missing renders as "to be confirmed", never invented.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import type { BookingStatus } from "@/lib/booking";

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
  const bookingId = sp.get("booking");
  const isDemo = sp.get("demo") === "true";

  // Server truth: the webhook flips the booking to deposit_paid moments after
  // Stripe redirects here. Poll the record briefly; if it never confirms (or
  // the API is unreachable) fall back to the redirect params — honestly
  // labeled as processing, never invented.
  const [serverStatus, setServerStatus] = useState<BookingStatus | null>(null);
  useEffect(() => {
    // Demo checkout charges nothing and fires no webhook — nothing to poll.
    if (!bookingId || isDemo) return;
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const headers = await getApiAuthHeaders();
        const res = await fetch(`/api/v1/bookings/${bookingId}`, { headers });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const status = data?.booking?.status;
        if (typeof status === "string") setServerStatus(status as BookingStatus);
        // Webhook can lag the redirect by a few seconds — retry while pending.
        if ((!status || status === "pending") && attempts < 5) {
          setTimeout(check, 2500);
        }
      } catch {
        // Signed out or API down — params-only rendering stays.
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [bookingId, isDemo]);

  const depositConfirmed = serverStatus === "deposit_paid";

  const rows: { label: string; value: string }[] = [
    { label: "Artist", value: artist ?? "To be confirmed" },
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
          <span>
            Deposit&nbsp;
            <span className="text-pink">
              {isDemo ? "demo — no charge" : depositConfirmed ? "paid ✓" : "processing"}
            </span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <SlashHeadline before="Deposit" slashed="down" size="section" />

          <div className="mt-12 border-2 hairline p-8 md:p-12">
            {deposit && (
              <div className="sticker inline-block px-5 py-3 -rotate-2">
                <div className="font-display text-[18px] tracking-widest leading-none tabular-nums">
                  ${deposit}
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-1">
                  {isDemo ? "Demo — no charge" : depositConfirmed ? "Deposit paid" : "Deposit processing"}
                </div>
              </div>
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
              Your requested time goes to the artist — they confirm the final slot.
              <br />
              Balance settles at the shop.
            </p>

            {bookingId && (
              <p className="mt-6 text-[9px] uppercase tracking-[0.15em] text-white/30 font-body break-all">
                Booking: {bookingId}
              </p>
            )}
            {sessionId && (
              <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-white/30 font-body break-all">
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
