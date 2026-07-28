"use client";

/**
 * The artist's own availability editor — the surface ADR 0027 named as missing.
 *
 * Two separate things happen here, and keeping them separate is the point:
 *
 *  1. **You declare the hours you are giving TatT.** Nothing is assumed. An
 *     empty week is a valid, meaningful answer: it means "I am not offering
 *     TatT any slots", and the artist stays on booking requests.
 *  2. **You may connect a Google Calendar.** It is used only to SUBTRACT — to
 *     take times you are already busy out of the hours you declared above. It
 *     can never add a slot you did not offer.
 *
 * The consent copy says exactly what the scope grants, because an artist being
 * asked to connect a personal calendar deserves to know we are asking for
 * busy/free times and not for their diary.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import { DAYS, EMPTY_WEEK, MAX_RANGES_PER_DAY } from "@/lib/artist-availability";
import type { DayOfWeek, TimeRange, WeeklySchedule } from "@/lib/scheduling-engine";

type Connection = {
  calendarId: string;
  connectedAt: string;
  writeEnabled: boolean;
  revokedAt?: string;
};

/** Only shown so the artist can see what we would ask for. Never assumed. */
const SCOPE_COPY = {
  read: "See when you are busy — start and end times only. Not event titles, guests, locations or notes.",
  write:
    "Put confirmed TattTester bookings on a separate 'TattTester Bookings' calendar we create in your account. We cannot see or change your existing calendars.",
};

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function dayLabel(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export default function AvailabilityEditor({ artistId }: { artistId: string }) {
  const searchParams = useSearchParams();
  const calendarResult = searchParams.get("calendar");

  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    EMPTY_WEEK(guessTimezone()),
  );
  const [connection, setConnection] = useState<Connection | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getApiAuthHeaders();
      const [schedRes, calRes] = await Promise.all([
        fetch(`/api/v1/artist/availability?artistId=${encodeURIComponent(artistId)}`, {
          headers,
        }),
        fetch(
          `/api/v1/artist/calendar/connect?artistId=${encodeURIComponent(artistId)}`,
          { headers },
        ),
      ]);

      if (schedRes.status === 403 || calRes.status === 403) {
        setError("This isn't your profile. Claim it first, then come back.");
        return;
      }
      const sched = await schedRes.json().catch(() => null);
      // A null schedule means nothing published yet — an empty week, not
      // invented default opening hours.
      if (sched?.schedule?.schedule) setSchedule(sched.schedule.schedule);

      const cal = await calRes.json().catch(() => null);
      setConnection(cal?.connected ? cal.connection : null);
      setConfigured(cal?.configured !== false);
    } catch {
      setError("Couldn't load your availability. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDay = (day: DayOfWeek, ranges: TimeRange[]) => {
    setSchedule((prev) => ({ ...prev, [day]: ranges }));
    setSaved(false);
  };

  const addRange = (day: DayOfWeek) => {
    const current = schedule[day] ?? [];
    if (current.length >= MAX_RANGES_PER_DAY) return;
    setDay(day, [...current, { start: "10:00", end: "18:00" }]);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const headers = await getApiAuthHeaders();
      const res = await fetch("/api/v1/artist/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ artistId, schedule, overrides: [] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // The API rejects rather than repairs, so its message names the exact
        // window that is wrong. Show it verbatim.
        setError(data?.error ?? "Couldn't save your hours.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Couldn't save your hours.");
    } finally {
      setBusy(false);
    }
  };

  const connect = async (includeWrite: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const headers = await getApiAuthHeaders();
      const res = await fetch("/api/v1/artist/calendar/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ artistId, includeWrite }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.authorizeUrl) {
        setError(data?.error ?? "Couldn't start the calendar connection.");
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch {
      setError("Couldn't start the calendar connection.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const headers = await getApiAuthHeaders();
      const res = await fetch("/api/v1/artist/calendar/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ artistId }),
      });
      if (!res.ok) {
        setError("Couldn't disconnect. Try again shortly.");
        return;
      }
      setConnection(null);
    } catch {
      setError("Couldn't disconnect. Try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(connection && !connection.revokedAt);

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Your availability
          </span>
          <span>{connected ? "Calendar connected" : "No calendar"}</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <SlashHeadline before="Hours you" slashed="give TattTester" size="section" />

          {calendarResult === "connected" && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-pink font-body">
              Calendar connected. Publish some hours below and clients can book
              real times.
            </p>
          )}
          {calendarResult === "cancelled" && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/50 font-body">
              Calendar connection cancelled. Nothing changed.
            </p>
          )}
          {calendarResult === "error" && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-pink font-body">
              That didn&apos;t work. You can try connecting again below.
            </p>
          )}

          {error && (
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-pink font-body">
              {error}
            </p>
          )}

          {/* ── 1. The hours you offer ───────────────────────────────── */}
          <div className="mt-10 border-2 hairline p-6 md:p-8">
            <h2 className="font-display text-[24px] tracking-wide text-white">
              When will you take TattTester clients?
            </h2>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/40 font-body leading-[1.8] max-w-xl">
              Only these hours are ever offered. Leave it empty and clients send
              you booking requests instead — that is a real answer, not a
              half-finished one.
            </p>

            <label className="mt-8 block text-[10px] uppercase tracking-[0.28em] text-pink font-body">
              ▸ Your timezone
            </label>
            <input
              type="text"
              value={schedule.timezone}
              onChange={(e) => {
                setSchedule((prev) => ({ ...prev, timezone: e.target.value }));
                setSaved(false);
              }}
              className="mt-2 w-full sm:w-80 bg-transparent border hairline px-3 py-2.5 text-white font-body text-[13px]"
              placeholder="America/Phoenix"
            />

            <div className="mt-8 space-y-5">
              {DAYS.map((day) => {
                const ranges = schedule[day] ?? [];
                return (
                  <div key={day} className="border-b hairline-soft pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-display text-[18px] tracking-wide text-white">
                        {dayLabel(day)}
                      </span>
                      <button
                        type="button"
                        onClick={() => addRange(day)}
                        disabled={ranges.length >= MAX_RANGES_PER_DAY}
                        className="text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-1.5 press font-body text-white/70 hover:text-black hover:bg-pink disabled:opacity-30"
                      >
                        + Window
                      </button>
                    </div>

                    {ranges.length === 0 ? (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/30 font-body">
                        Closed
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {ranges.map((range, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={range.start}
                              onChange={(e) =>
                                setDay(
                                  day,
                                  ranges.map((r, j) =>
                                    j === i ? { ...r, start: e.target.value } : r,
                                  ),
                                )
                              }
                              className="bg-transparent border hairline px-2 py-1.5 text-white font-body text-[13px] tabular-nums"
                            />
                            <span className="text-white/30 font-body text-[12px]">to</span>
                            <input
                              type="time"
                              value={range.end}
                              onChange={(e) =>
                                setDay(
                                  day,
                                  ranges.map((r, j) =>
                                    j === i ? { ...r, end: e.target.value } : r,
                                  ),
                                )
                              }
                              className="bg-transparent border hairline px-2 py-1.5 text-white font-body text-[13px] tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDay(
                                  day,
                                  ranges.filter((_, j) => j !== i),
                                )
                              }
                              className="ml-auto text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink press font-body"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <TapeCTA size="md" disabled={busy || loading} onClick={save}>
                {busy ? "Saving…" : "Save hours"}
              </TapeCTA>
              {saved && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-pink font-body">
                  Saved
                </span>
              )}
            </div>
          </div>

          {/* ── 2. Calendar connection ───────────────────────────────── */}
          <div className="mt-10 border-2 hairline p-6 md:p-8">
            <h2 className="font-display text-[24px] tracking-wide text-white">
              Connect your calendar
            </h2>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/40 font-body leading-[1.8] max-w-xl">
              Optional. It only ever removes times from the hours above — it can
              never add one. Without it, clients still send you requests.
            </p>

            {!configured ? (
              <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/40 font-body">
                Calendar connections aren&apos;t switched on for this
                environment yet.
              </p>
            ) : connected ? (
              <div className="mt-6">
                <p className="text-[12px] text-white/70 font-body leading-[1.6]">
                  Connected{" "}
                  {new Date(connection!.connectedAt).toLocaleDateString()}.{" "}
                  {connection!.writeEnabled
                    ? "Confirmed bookings are written to your TattTester Bookings calendar."
                    : "We read your busy times only."}
                </p>
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={busy}
                  className="mt-5 text-[10px] uppercase tracking-[0.2em] border hairline px-4 py-2.5 press font-body text-white/70 hover:text-black hover:bg-pink disabled:opacity-40"
                >
                  Disconnect
                </button>
                <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/30 font-body leading-[1.7] max-w-lg">
                  Disconnecting is immediate. Your profile keeps working — it
                  goes back to booking requests.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="border hairline-soft p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-pink font-body">
                    What we ask for
                  </div>
                  <p className="mt-2 text-[12px] text-white/70 font-body leading-[1.6]">
                    {SCOPE_COPY.read}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <TapeCTA size="md" disabled={busy} onClick={() => connect(false)}>
                    Connect (read busy times)
                  </TapeCTA>
                  <button
                    type="button"
                    onClick={() => connect(true)}
                    disabled={busy}
                    className="text-[10px] uppercase tracking-[0.2em] border hairline px-4 py-3 press font-body text-white/70 hover:text-black hover:bg-pink disabled:opacity-40"
                  >
                    Also write my bookings
                  </button>
                </div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-body leading-[1.7] max-w-lg">
                  {SCOPE_COPY.write}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
