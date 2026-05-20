"use client";

import { useState } from "react";
import StudioShell from "@/components/studio/StudioShell";

const STEPS = [
  { n: "01", label: "Pick a Date" },
  { n: "02", label: "Confirm Design" },
  { n: "03", label: "Pay Deposit" },
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function BookPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const today = 12;

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
          <h1 className="font-display text-white text-[48px] md:text-[80px] leading-[0.88] tracking-[0.005em]">
            Book the&nbsp;<span className="slash"><span>chair</span></span>
            <span className="text-pink">.</span>
          </h1>

          {/* STEPPER */}
          <div className="mt-12 flex flex-col sm:flex-row sm:items-stretch gap-0 sm:gap-0 border-2 hairline">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r hairline last:border-r-0 last:border-b-0 flex items-center gap-4 ${
                  i === 0 ? "bg-pink text-black" : "text-white/60"
                }`}
              >
                <span className="font-display text-[28px] leading-none tabular-nums">
                  {s.n}
                </span>
                <span className="text-[12px] uppercase tracking-[0.25em] font-body">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* CALENDAR */}
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
                const day = i - 5; // offset so March starts on Sunday-ish
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

          {/* SELECTED + CTA */}
          {selected !== null && (
            <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
              <div className="sticker inline-block px-5 py-3 self-start">
                <div className="font-display text-[14px] tracking-widest leading-none">
                  March&nbsp;{selected}
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-1">
                  2026&nbsp;/&nbsp;Selected
                </div>
              </div>
              <button
                onClick={() => console.log("proceed", selected)}
                className="tape press inline-flex items-center justify-center px-8 py-4 font-display text-[28px] leading-none tracking-[0.02em] self-start"
              >
                Proceed
                <span className="ml-3 text-[18px]">▸</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
