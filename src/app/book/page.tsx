"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useBookings, useDesigns, type TattDesign } from "@/lib/tattStorage";

const STEPS = [
  { n: "01", label: "Pick a Date" },
  { n: "02", label: "Confirm Design" },
  { n: "03", label: "Pay Deposit" },
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function isoDateForMarch(day: number): string {
  return `2026-03-${String(day).padStart(2, "0")}`;
}

export default function BookPage() {
  const router = useRouter();
  const { addBooking } = useBookings();
  const { designs } = useDesigns();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [card, setCard] = useState("");
  const today = 12;

  const advanceToConfirm = () => {
    if (selected !== null) setStep(1);
  };
  const advanceToPay = () => {
    setStep(2);
  };
  const completeBooking = () => {
    if (selected === null) return;
    const design = designs.find((d) => d.id === designId);
    addBooking({
      date: isoDateForMarch(selected),
      designId: design?.id,
      depositPaid: true,
    });
    router.push("/bookings");
  };

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Booking
          </span>
          <span>March&nbsp;<span className="text-pink">2026</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <SlashHeadline before="Book the" slashed="chair" size="section" />

          {/* STEPPER */}
          <div className="mt-12 flex flex-col sm:flex-row sm:items-stretch gap-0 border-2 hairline">
            {STEPS.map((s, i) => (
              <button
                key={s.n}
                type="button"
                onClick={() => {
                  if (i <= step) setStep(i as 0 | 1 | 2);
                }}
                disabled={i > step}
                className={`flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r hairline last:border-r-0 last:border-b-0 flex items-center gap-4 press text-left ${
                  i === step
                    ? "bg-pink text-black"
                    : i < step
                    ? "text-pink hover:bg-white/5"
                    : "text-white/40"
                }`}
              >
                <span className="font-display text-[28px] leading-none tabular-nums">
                  {s.n}
                </span>
                <span className="text-[12px] uppercase tracking-[0.25em] font-body">
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* STEP 01: CALENDAR */}
          {step === 0 && (
            <div className="mt-12 border-2 hairline p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-display text-[24px] tracking-wide text-white">
                  Pick a date
                </h2>
                <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body">
                  March&nbsp;2026
                </span>
              </div>

              <div className="grid grid-cols-7 gap-0 border-b hairline">
                {DAYS.map((d, i) => (
                  <div
                    key={i}
                    className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-body text-center py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0">
                {Array.from({ length: 35 }).map((_, i) => {
                  const day = i - 5;
                  const valid = day > 0 && day <= 31;
                  const isToday = valid && day === today;
                  const isSel = valid && selected === day;
                  return (
                    <button
                      key={i}
                      onClick={() => valid && setSelected(day)}
                      disabled={!valid}
                      className={`aspect-square border hairline-soft flex items-center justify-center font-display text-[20px] leading-none press ${
                        !valid
                          ? "opacity-20"
                          : isSel
                          ? "bg-pink text-black"
                          : isToday
                          ? "text-pink"
                          : "text-white/70 hover:bg-white/5 hover:text-pink"
                      }`}
                    >
                      {valid ? day : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 02: CONFIRM DESIGN */}
          {step === 1 && (
            <div className="mt-12 border-2 hairline p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-display text-[24px] tracking-wide text-white">
                  Pick a design
                </h2>
                <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body tabular-nums">
                  {designs.length}&nbsp;saved
                </span>
              </div>

              {designs.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-display text-[20px] text-white/60 tracking-wide">
                    No designs yet — proceed without one.
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
                    You can attach a design after the session is booked.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setDesignId(null)}
                    className={`aspect-square border-2 ${
                      designId === null ? "border-pink" : "hairline"
                    } press flex flex-col items-center justify-center gap-2 text-white/70 hover:text-pink`}
                  >
                    <span className="font-display text-[20px] tracking-wide">No design</span>
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
                      <div className={`aspect-square ${d.color} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 mix-blend-multiply" />
                      </div>
                      <div className="p-3">
                        <div className="font-display text-[14px] tracking-wide text-white line-clamp-1">
                          {d.prompt.split(/[\s,]+/).slice(0, 3).join(" ") || "Untitled"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 03: PAY DEPOSIT */}
          {step === 2 && (
            <div className="mt-12 border-2 hairline p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-display text-[24px] tracking-wide text-white">
                  Pay deposit
                </h2>
                <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body tabular-nums">
                  $50&nbsp;hold
                </span>
              </div>
              <div className="space-y-6 max-w-md">
                <div>
                  <label
                    htmlFor="card"
                    className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
                  >
                    ▸ Card number
                  </label>
                  <input
                    id="card"
                    type="text"
                    inputMode="numeric"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display tabular-nums"
                  />
                  <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
                    Demo only — nothing is charged. Any number works.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ACTION ROW */}
          <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            {selected !== null && (
              <div className="sticker inline-block px-5 py-3 self-start">
                <div className="font-display text-[14px] tracking-widest leading-none">
                  March&nbsp;{selected}
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-1">
                  2026&nbsp;/&nbsp;Selected
                </div>
              </div>
            )}
            <div className="sm:ml-auto">
              {step === 0 && (
                <button
                  onClick={advanceToConfirm}
                  disabled={selected === null}
                  className={`tape press inline-flex items-center justify-center px-8 py-4 font-display text-[28px] leading-none tracking-[0.02em] self-start ${
                    selected === null ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  Next
                  <span className="ml-3 text-[18px]">▸</span>
                </button>
              )}
              {step === 1 && (
                <button
                  onClick={advanceToPay}
                  className="tape press inline-flex items-center justify-center px-8 py-4 font-display text-[28px] leading-none tracking-[0.02em] self-start"
                >
                  Next
                  <span className="ml-3 text-[18px]">▸</span>
                </button>
              )}
              {step === 2 && (
                <button
                  onClick={completeBooking}
                  disabled={card.trim().length < 4}
                  className={`tape press inline-flex items-center justify-center px-8 py-4 font-display text-[28px] leading-none tracking-[0.02em] self-start ${
                    card.trim().length < 4 ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  Confirm
                  <span className="ml-3 text-[18px]">▸</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
