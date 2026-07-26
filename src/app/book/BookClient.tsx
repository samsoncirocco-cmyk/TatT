"use client";

/**
 * Punk booking flow — real capture, honest availability.
 *
 * Path: pick artist (from /artists or /matches via ?artistId=) →
 * request time slots → design + details → review → POST /api/v1/book
 * (Firestore capture) → POST /api/checkout (Stripe deposit). When
 * payments aren't configured the request is still saved and the UI
 * says so plainly — no fake charges, no fake confirmations.
 *
 * Which of the two models the client gets is decided per artist, server-side,
 * by `resolveBookingMode` (ADR 0027):
 *
 *  - RESERVATION — the artist has a synced calendar and published hours, so we
 *    show concrete times. Picking one takes an exclusive hold before checkout,
 *    and the deposit pays for that specific slot.
 *  - REQUEST — everyone else, which is most of the roster and permanently so.
 *    Unchanged from before: pick preferred dates, the artist confirms after.
 *
 * The principle that produced the request model is intact, not abandoned: we
 * still never show a slot that is not real. The difference is that a synced
 * calendar makes some slots real. `offer.slots` is non-empty only in
 * reservation mode — the server guarantees it — so there is no path here that
 * renders a time we cannot hold.
 */

import { useMemo, useState } from "react";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import { useBookings, useDesigns, type TattDesign } from "@/lib/tattStorage";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import {
  depositDollarsForSize,
  MAX_REQUESTED_SLOTS,
  type RequestedSlot,
} from "@/lib/booking";

/** One concrete bookable time, as offered by the server. */
export type OfferedSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

/**
 * What the server is willing to offer for this artist right now. `mode` is the
 * honest statement of which product the client is getting, and `slots` is
 * non-empty only when that mode is "reservation".
 */
export type BookOffer = {
  mode: "reservation" | "request";
  label: string;
  detail: string;
  slots: OfferedSlot[];
  timezone?: string;
};

export type BookArtist = {
  id: string;
  slug: string;
  name: string;
  location: string;
  shopName: string | null;
  styles: string[];
  availabilityStatus: string;
  availabilityLabel: string;
  availabilityNote: string | null;
};

const STEPS = [
  { n: "01", label: "Request a Time", hint: "When" },
  { n: "02", label: "Design + Details", hint: "What" },
  { n: "03", label: "Review + Deposit", hint: "Send it" },
];

const SIZES = [
  { id: "small", label: "Small", desc: 'Under 2"' },
  { id: "medium", label: "Medium", desc: '2"–4"' },
  { id: "large", label: "Large", desc: '4"–8"' },
  { id: "sleeve", label: "Sleeve", desc: "Full arm" },
];

const PLACEMENTS = [
  "Forearm", "Upper Arm", "Shoulder", "Back", "Chest",
  "Ribcage", "Thigh", "Calf", "Ankle", "Neck", "Hand", "Other",
];

const TIME_PREFS = ["Flexible", "Morning", "Afternoon", "Evening"] as const;

const BUDGETS = [
  { value: "under-300", label: "Under $300" },
  { value: "300-600", label: "$300 – $600" },
  { value: "600-1200", label: "$600 – $1,200" },
  { value: "1200-2500", label: "$1,200 – $2,500" },
  { value: "2500+", label: "$2,500+" },
  { value: "flexible", label: "Flexible — let the artist quote" },
];

/** Next `count` real calendar days starting tomorrow. No fake gaps. */
function upcomingDays(count: number): { iso: string; date: Date }[] {
  const out: { iso: string; date: Date }[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    out.push({ iso, date: d });
  }
  return out;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "2026-08-06" → "Thu, Aug 6", parsed as a wall-clock date, not an instant. */
function formatSlotDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return shortDate(new Date(y, m - 1, d));
}

/** Group offered slots by day, preserving the server's ordering. */
function groupSlotsByDate(slots: OfferedSlot[]): Array<[string, OfferedSlot[]]> {
  const byDate = new Map<string, OfferedSlot[]>();
  for (const slot of slots) {
    const bucket = byDate.get(slot.date);
    if (bucket) bucket.push(slot);
    else byDate.set(slot.date, [slot]);
  }
  return [...byDate.entries()];
}

type Phase = "form" | "submitting" | "captured";

export default function BookClient({
  artist,
  requestedArtistId,
  artistLoadFailed,
  designSessionId = "",
  offer,
}: {
  artist: BookArtist | null;
  requestedArtistId: string;
  artistLoadFailed: boolean;
  /** Design-session id from the "ds" query param — rides on the booking POST. */
  designSessionId?: string;
  /** Which booking model this artist is on, and the times we can hold. */
  offer: BookOffer;
}) {
  const { addBooking } = useBookings();
  const { designs } = useDesigns();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  // Step 01 — requested slots
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [timePref, setTimePref] = useState<(typeof TIME_PREFS)[number]>("Flexible");

  // Step 01, reservation model — one concrete slot, which we will hold.
  const [selectedSlot, setSelectedSlot] = useState<OfferedSlot | null>(null);
  /**
   * Set when a reservation degrades mid-flow: the slot was taken between
   * loading the page and pressing book, or holds went unavailable. The UI drops
   * to the request model and says so, rather than retrying into a promise it
   * can no longer keep.
   */
  const [reservationLost, setReservationLost] = useState<string | null>(null);

  // Reservation mode only survives while the server is still offering slots AND
  // nothing has degraded underneath us.
  const reserving =
    offer.mode === "reservation" && offer.slots.length > 0 && !reservationLost;

  // Step 02 — design + details
  const [designId, setDesignId] = useState<string | null>(null);
  const [size, setSize] = useState("");
  const [placement, setPlacement] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Result — set when the booking is captured but no payment happened
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentsUnavailable, setPaymentsUnavailable] = useState(false);

  const days = useMemo(() => upcomingDays(28), []);
  const slotsByDate = useMemo(() => groupSlotsByDate(offer.slots), [offer.slots]);
  const chosenDesign = designs.find((d) => d.id === designId);
  const deposit = depositDollarsForSize(size || undefined);

  const detailsValid =
    size && placement && description.trim().length > 10 && name.trim() && email.trim() && budget;

  const toggleDate = (iso: string) => {
    setSelectedDates((prev) =>
      prev.includes(iso)
        ? prev.filter((d) => d !== iso)
        : prev.length >= MAX_REQUESTED_SLOTS
          ? prev
          : [...prev, iso].sort(),
    );
  };

  // On the reservation path the booking record carries the exact time being
  // held, not a preference — the deposit is for that slot and nothing else.
  const requestedSlots: RequestedSlot[] = reserving
    ? selectedSlot
      ? [{ date: selectedSlot.date, time: selectedSlot.startTime }]
      : []
    : selectedDates.map((date) =>
        timePref === "Flexible" ? { date } : { date, time: timePref },
      );

  /** Has step 01 been answered, in whichever model applies? */
  const timeChosen = reserving ? Boolean(selectedSlot) : selectedDates.length > 0;

  const submit = async () => {
    if (!artist || !detailsValid || !timeChosen) return;
    setPhase("submitting");
    setError(null);

    try {
      const authHeaders = await getApiAuthHeaders();

      // 1. Capture the booking request — this is the real record.
      const bookRes = await fetch("/api/v1/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          artistId: artist.id,
          artistName: artist.name,
          clientName: name.trim(),
          clientEmail: email.trim(),
          clientPhone: phone.trim() || undefined,
          description: description.trim(),
          budget,
          designId: chosenDesign?.id,
          designImageUrl: chosenDesign?.image,
          designSessionId: designSessionId || undefined,
          requestedSlots,
        }),
      });
      const bookData = await bookRes.json().catch(() => null);
      if (!bookRes.ok || !bookData?.success) {
        throw new Error(bookData?.error || "Couldn't save your booking request.");
      }
      setBookingId(bookData.bookingId);

      // Mirror into local bookings so /bookings shows it immediately.
      // depositPaid stays false until Stripe actually confirms.
      addBooking({
        artistSlug: artist.slug,
        artistName: artist.name,
        designId: chosenDesign?.id,
        date: reserving && selectedSlot ? selectedSlot.date : selectedDates[0],
        depositPaid: false,
      });

      // 1b. Reservation path — hold the slot BEFORE paying for it. If the hold
      // fails there is nothing to pay for, so we stop and say why rather than
      // taking money for a time we do not have.
      let holdId: string | undefined;
      if (reserving && selectedSlot) {
        const holdRes = await fetch("/api/v1/book/hold", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            artistId: artist.id,
            bookingId: bookData.bookingId,
            ...selectedSlot,
          }),
        });
        const holdData = await holdRes.json().catch(() => null);

        if (holdRes.status === 409) {
          // Somebody else took it between the page loading and this click.
          setSelectedSlot(null);
          setReservationLost(
            "That time was taken while you were filling this in. Pick your dates and the artist will confirm.",
          );
          setStep(0);
          setPhase("form");
          return;
        }
        if (!holdRes.ok || !holdData?.holdId) {
          // Reservations are unavailable for this artist right now. The request
          // the client already sent is safe — degrade to it honestly instead of
          // failing the whole booking.
          setSelectedSlot(null);
          setReservationLost(
            "We couldn't hold that time. Your request is saved — the artist will confirm a slot with you.",
          );
          setPaymentsUnavailable(false);
          setPhase("captured");
          return;
        }
        holdId = holdData.holdId;
      }

      // 2. Deposit via Stripe Checkout. If payments aren't configured
      // the request above is still saved — degrade honestly.
      const payRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          artistId: artist.id,
          artistName: artist.name,
          size,
          placement,
          date: reserving && selectedSlot ? selectedSlot.date : selectedDates[0],
          time: reserving && selectedSlot ? selectedSlot.startTime : timePref,
          budget,
          clientName: name.trim(),
          clientEmail: email.trim(),
          bookingId: bookData.bookingId,
          // Present only on the reservation path. It ties this payment to the
          // held slot and caps the Stripe session at the hold's expiry.
          holdId,
        }),
      });
      const payData = await payRes.json().catch(() => null);

      if (payRes.ok && typeof payData?.sessionUrl === "string") {
        window.location.href = payData.sessionUrl;
        return;
      }

      setPaymentsUnavailable(true);
      setPhase("captured");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke. Try again.");
      setPhase("form");
    }
  };

  // ─── No artist picked / not found ────────────────────────────────────
  if (!artist) {
    return (
      <StudioShell>
        <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 font-body">
            <span><span className="text-pink">●</span>&nbsp;&nbsp;Booking</span>
            <span>Step&nbsp;<span className="text-pink">0/3</span></span>
          </div>
        </div>
        <div className="px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <SlashHeadline before="Pick your" slashed="artist" size="section" />
            <div className="mt-12 border-2 hairline p-10 md:p-14 text-center">
              <p className="font-display text-[24px] md:text-[32px] tracking-wide text-white/70">
                {artistLoadFailed ? (
                  <>Couldn&apos;t reach the artist graph.</>
                ) : requestedArtistId ? (
                  <>That artist isn&apos;t in the roster.</>
                ) : (
                  <>A booking starts with an artist.</>
                )}
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/40 font-body leading-[1.9]">
                {artistLoadFailed
                  ? "The live roster is unreachable right now — try again in a minute."
                  : "Browse the roster or your matches, then hit Book the Chair on their profile."}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <TapeCTA href="/artists" size="md">Browse the roster</TapeCTA>
                <TapeCTA href="/matches" variant="ghost" size="sm">Your matches</TapeCTA>
              </div>
            </div>
          </div>
        </div>
      </StudioShell>
    );
  }

  // ─── Captured, payments unavailable ──────────────────────────────────
  if (phase === "captured") {
    return (
      <StudioShell>
        <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <span><span className="text-pink">●</span>&nbsp;&nbsp;Booking</span>
            <span>Request&nbsp;<span className="text-pink">sent</span></span>
          </div>
        </div>
        <div className="px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <SlashHeadline before="Request" slashed="sent" size="section" />
            <div className="mt-12 border-2 hairline p-8 md:p-12">
              <div className="sticker inline-block px-5 py-3">
                <div className="font-display text-[18px] tracking-widest leading-none tabular-nums">
                  {bookingId}
                </div>
                <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-1">
                  Confirmation
                </div>
              </div>
              <p className="mt-8 font-display text-[22px] md:text-[28px] tracking-wide text-white leading-[1.2]">
                Your request is with {artist.name}.
              </p>
              <p className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/50 font-body leading-[1.9] max-w-xl">
                They&apos;ll confirm a time from your requested dates.
                {paymentsUnavailable && (
                  <>
                    <br />
                    <span className="text-pink">
                      Payments aren&apos;t configured yet — no deposit was charged.
                    </span>
                    &nbsp;You&apos;ll settle the deposit once the artist confirms.
                  </>
                )}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <TapeCTA href="/bookings" size="md">Your bookings</TapeCTA>
                <TapeCTA href={`/artists/${artist.slug}`} variant="ghost" size="sm">
                  Back to {artist.name}
                </TapeCTA>
              </div>
            </div>
          </div>
        </div>
      </StudioShell>
    );
  }

  // ─── The 3-step flow ─────────────────────────────────────────────────
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Booking</span>
          <span>{artist.name}</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <SlashHeadline before="Book the" slashed="chair" size="section" />

          {/* ARTIST STRIP — who you're booking, with honest availability */}
          <div className="mt-8 border-2 hairline p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <div className="font-display text-[22px] tracking-wide text-white leading-none">
                {artist.name}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/50 font-body">
                {[artist.shopName, artist.location].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="ml-auto sticker px-3 py-1.5 -rotate-2">
              <span className="font-body text-[10px] uppercase tracking-[0.18em]">
                {artist.availabilityLabel}
              </span>
            </div>
          </div>

          {/* STEP INDICATOR */}
          <div className="mt-10 flex flex-col sm:flex-row sm:items-stretch gap-0 border-2 hairline">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              const doneDetail =
                i === 0
                  ? reserving
                    ? selectedSlot
                      ? `${formatSlotDate(selectedSlot.date)} ${selectedSlot.startTime}`
                      : "No time picked"
                    : `${selectedDates.length} date${selectedDates.length === 1 ? "" : "s"}`
                  : i === 1
                    ? size
                      ? `${size} / ${placement}`
                      : "Details set"
                    : "";
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => { if (i <= step) setStep(i as 0 | 1 | 2); }}
                  disabled={i > step}
                  className={`relative flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r hairline last:border-r-0 last:border-b-0 flex items-center gap-4 press text-left ${
                    active ? "bg-pink/[0.06]" : done ? "hover:bg-white/5" : ""
                  }`}
                >
                  {active && <span className="absolute top-0 left-0 right-0 h-1 bg-pink" />}
                  <span
                    className={`font-display text-[26px] leading-none tabular-nums ${
                      active ? "text-pink" : "text-white/30"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[10px] uppercase tracking-[0.22em] font-body ${
                        active ? "text-white" : done ? "text-white/70" : "text-white/50"
                      }`}
                    >
                      {s.label}
                    </span>
                    <span
                      className={`block text-[10px] uppercase tracking-[0.18em] font-body mt-0.5 truncate ${
                        active ? "text-pink" : "text-white/35"
                      }`}
                    >
                      {active ? "In progress" : done ? `✓ ${doneDetail}` : s.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* STEP 01 — PICK A TIME (reservation) or REQUEST DATES (request) */}
          {step === 0 && (
            <div className="mt-10 border-2 hairline p-6 md:p-8">
              <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
                <h2 className="font-display text-[24px] tracking-wide text-white">
                  {reserving ? "Pick your time" : "Request your dates"}
                </h2>
                <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body tabular-nums">
                  {reserving ? offer.label : `Up to ${MAX_REQUESTED_SLOTS}`}
                </span>
              </div>

              {/* The client is told which product they are getting, always. */}
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-body leading-[1.8] max-w-xl">
                {reserving
                  ? offer.detail
                  : (artist.availabilityNote ??
                    `${artist.name} confirms your slot after you send the request — these are asks, not reservations.`)}
              </p>

              {/* A reservation that stopped being available mid-flow says so. */}
              {reservationLost && (
                <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-pink font-body leading-[1.8] max-w-xl">
                  {reservationLost}
                </p>
              )}

              {reserving ? (
                <div className="mt-6 space-y-6">
                  {slotsByDate.map(([date, daySlots]) => (
                    <div key={date}>
                      <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                        ▸ {formatSlotDate(date)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((slot) => {
                          const sel =
                            selectedSlot?.date === slot.date &&
                            selectedSlot?.startTime === slot.startTime;
                          return (
                            <button
                              key={`${slot.date}-${slot.startTime}`}
                              type="button"
                              onClick={() => setSelectedSlot(sel ? null : slot)}
                              className={`text-[11px] uppercase tracking-[0.2em] border hairline px-4 py-3 press font-body tabular-nums ${
                                sel
                                  ? "bg-pink text-black border-pink"
                                  : "text-white/70 hover:text-black hover:bg-pink"
                              }`}
                            >
                              {slot.startTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {days.map(({ iso, date }) => {
                  const sel = selectedDates.includes(iso);
                  const full = !sel && selectedDates.length >= MAX_REQUESTED_SLOTS;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => toggleDate(iso)}
                      disabled={full}
                      className={`border hairline-soft px-3 py-3 text-left press font-body ${
                        sel
                          ? "bg-pink text-black"
                          : full
                            ? "text-white/25 cursor-not-allowed"
                            : "text-white/70 hover:bg-white/5 hover:text-pink"
                      }`}
                    >
                      <span className="block font-display text-[18px] leading-none tracking-wide">
                        {shortDate(date)}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[0.2em] mt-1.5 opacity-70">
                        {sel ? "✓ Requested" : "Tap to request"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8">
                <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                  ▸ Time of day
                </div>
                <div className="flex flex-wrap gap-2">
                  {TIME_PREFS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimePref(t)}
                      className={`text-[10px] uppercase tracking-[0.2em] border hairline px-4 py-2.5 press font-body ${
                        timePref === t
                          ? "bg-pink text-black border-pink"
                          : "text-white/70 hover:text-black hover:bg-pink"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {/* STEP 02 — DESIGN + DETAILS */}
          {step === 1 && (
            <div className="mt-10 border-2 hairline p-6 md:p-8 space-y-10">
              {/* Design */}
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-[24px] tracking-wide text-white">
                    Pick a design
                  </h2>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body tabular-nums">
                    {designs.length}&nbsp;saved
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setDesignId(null)}
                    className={`aspect-square border-2 ${
                      designId === null ? "border-pink" : "hairline"
                    } press flex flex-col items-center justify-center gap-2 text-white/70 hover:text-pink`}
                  >
                    <span className="font-display text-[18px] tracking-wide">No design</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-body">
                      Decide in chair
                    </span>
                  </button>
                  {designs.map((d: TattDesign) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDesignId(d.id)}
                      className={`group press text-left border-2 ${
                        designId === d.id ? "border-pink" : "hairline"
                      }`}
                    >
                      <div className={`aspect-square ${d.image ? "bg-bone" : d.color} relative overflow-hidden`}>
                        {d.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.image}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 mix-blend-multiply" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="font-display text-[13px] tracking-wide text-white line-clamp-1">
                          {d.prompt.split(/[\s,]+/).slice(0, 3).join(" ") || "Untitled"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                  ▸ Size
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.id)}
                      className={`border-2 px-4 py-3 text-left press ${
                        size === s.id ? "border-pink bg-pink/[0.08]" : "hairline hover:bg-white/5"
                      }`}
                    >
                      <span className="block font-display text-[18px] tracking-wide text-white">
                        {s.label}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
                        {s.desc} · ${depositDollarsForSize(s.id)} deposit
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Placement */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                  ▸ Placement
                </div>
                <div className="flex flex-wrap gap-2">
                  {PLACEMENTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlacement(p)}
                      className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body ${
                        placement === p
                          ? "bg-pink text-black border-pink"
                          : "text-white/70 hover:text-black hover:bg-pink"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vision */}
              <div>
                <label
                  htmlFor="vision"
                  className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
                >
                  ▸ Describe your vision
                </label>
                <textarea
                  id="vision"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  rows={3}
                  placeholder="Style, mood, references — what matters to you…"
                  className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[16px] leading-[1.5] border-2 hairline focus:border-pink p-4 transition-colors font-body resize-none"
                />
              </div>

              {/* Budget */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                  ▸ Budget
                </div>
                <div className="flex flex-wrap gap-2">
                  {BUDGETS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setBudget(b.value)}
                      className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body ${
                        budget === b.value
                          ? "bg-pink text-black border-pink"
                          : "text-white/70 hover:text-black hover:bg-pink"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                  ▸ Your info
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    aria-label="Name"
                    className="bg-black text-white placeholder-white/30 focus:outline-none text-[14px] border-2 hairline focus:border-pink px-4 py-3 font-body"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    aria-label="Email"
                    type="email"
                    className="bg-black text-white placeholder-white/30 focus:outline-none text-[14px] border-2 hairline focus:border-pink px-4 py-3 font-body"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    aria-label="Phone"
                    type="tel"
                    className="bg-black text-white placeholder-white/30 focus:outline-none text-[14px] border-2 hairline focus:border-pink px-4 py-3 font-body sm:col-span-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 03 — REVIEW + DEPOSIT */}
          {step === 2 && (
            <div className="mt-10 border-2 hairline p-6 md:p-8">
              <h2 className="font-display text-[24px] tracking-wide text-white mb-6">
                Review the request
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-[13px] font-body">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">Artist</dt>
                  <dd className="mt-1 text-white">{artist.name} · {artist.location}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Requested dates ({timePref.toLowerCase()})
                  </dt>
                  <dd className="mt-1 text-white">
                    {selectedDates
                      .map((iso) => shortDate(new Date(`${iso}T00:00:00`)))
                      .join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">Piece</dt>
                  <dd className="mt-1 text-white capitalize">{size} · {placement}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">Design</dt>
                  <dd className="mt-1 text-white">
                    {chosenDesign
                      ? chosenDesign.prompt.split(/[\s,]+/).slice(0, 4).join(" ")
                      : "No design — decide in chair"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">Budget</dt>
                  <dd className="mt-1 text-white">
                    {BUDGETS.find((b) => b.value === budget)?.label ?? budget}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">Contact</dt>
                  <dd className="mt-1 text-white">{name} · {email}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">Vision</dt>
                  <dd className="mt-1 text-white/80 leading-[1.6] normal-case">
                    &ldquo;{description.trim()}&rdquo;
                  </dd>
                </div>
              </dl>

              <div className="mt-8 border-t hairline pt-6 flex flex-wrap items-center gap-4">
                <div className="sticker px-4 py-2">
                  <div className="font-display text-[16px] tracking-widest leading-none tabular-nums">
                    ${deposit}
                  </div>
                  <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-1">
                    Deposit
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-body leading-[1.8]">
                  Deposit holds your request. Balance settles at the shop.
                  <br />
                  Dates are confirmed by the artist — not by paying.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 border-2 border-pink p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-pink font-body">
                {error}
              </p>
            </div>
          )}

          {/* ACTION ROW */}
          <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {step === 0 && (reserving ? Boolean(selectedSlot) : selectedDates.length > 0) && (
              <div className="sticker inline-block px-5 py-3 self-start">
                <div className="font-display text-[14px] tracking-widest leading-none tabular-nums">
                  {reserving && selectedSlot
                    ? selectedSlot.startTime
                    : `${selectedDates.length}/${MAX_REQUESTED_SLOTS}`}
                </div>
                <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-1">
                  {reserving ? "Time picked" : "Dates requested"}
                </div>
              </div>
            )}
            <div className="sm:ml-auto">
              {step === 0 && (
                <TapeCTA
                  size="md"
                  disabled={!timeChosen}
                  onClick={() => setStep(1)}
                >
                  Next
                </TapeCTA>
              )}
              {step === 1 && (
                <TapeCTA size="md" disabled={!detailsValid} onClick={() => setStep(2)}>
                  Review
                </TapeCTA>
              )}
              {step === 2 && (
                <TapeCTA size="md" disabled={phase === "submitting"} onClick={submit}>
                  {phase === "submitting" ? "Sending…" : "Send request"}
                </TapeCTA>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
