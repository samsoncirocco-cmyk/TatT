"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import QuietHeadline from "@/components/quiet/QuietHeadline";
import PunkToggle from "@/components/punk/PunkToggle";
import { useStylePreferences, useUser } from "@/lib/tattStorage";
import { authDoorHref } from "@/lib/knownUser";
import { CANONICAL_STYLES } from "@/lib/style-vocabulary";

const NAV = ["Profile", "Notifications", "Billing", "Delete account"];

const NOTIF_KEY = "tatt:notification-prefs";

const NOTIF_OPTIONS = [
  {
    key: "cuts",
    label: "Generation done",
    description: "Ping when your four takes land in the design session.",
    default: true,
  },
  {
    key: "artist",
    label: "Artist replies",
    description: "When a matched artist responds to your booking.",
    default: true,
  },
  {
    key: "drops",
    label: "Side B drops",
    description: "New features, new flash, no filler.",
    default: false,
  },
] as const;

// Style preferences feed artist matching, so they must be the same vocabulary
// the match query speaks. This list used to be its own invention — 6 of its 12
// entries ("Neo-Trad", "Surreal", "Botanical", "Color Realism", "Minimal",
// plus "Fineline") existed nowhere else in the codebase, so saving them was a
// no-op the user could never see the effect of.
const STYLES = CANONICAL_STYLES;

export default function SettingsPage() {
  const router = useRouter();
  const { user, hydrated, updateUser, signOut, error: authError } = useUser();
  const {
    stylePreferences,
    hydrated: stylesHydrated,
    setStylePreferences,
  } = useStylePreferences();
  const [active, setActive] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIF_OPTIONS.map((o) => [o.key, o.default])),
  );

  // Sync local form state from store on hydration / user change.
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration sync from external auth/localStorage stores */
  useEffect(() => {
    if (!hydrated) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    try {
      const stored = window.localStorage.getItem(NOTIF_KEY);
      if (stored) setNotifs((n) => ({ ...n, ...JSON.parse(stored) }));
    } catch {
      /* corrupted prefs — keep defaults */
    }
  }, [hydrated, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The saved taste profile is deliberately independent of sign-in: a visitor
  // can teach TatT their taste before deciding to create an account.
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration sync from the external taste store */
  useEffect(() => {
    if (!stylesHydrated) return;
    setPicked(stylePreferences);
  }, [stylePreferences, stylesHydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setNotif = (key: string, value: boolean) => {
    setNotifs((n) => {
      const next = { ...n, [key]: value };
      try {
        window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* storage full/blocked — state still updates for the session */
      }
      return next;
    });
  };

  const toggle = (s: string) =>
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const handleSave = async () => {
    setStylePreferences(picked);
    if (user) {
      await updateUser({ name: name.trim() || undefined });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Settings</span>
          <span>Taste + account</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <QuietHeadline>Settings</QuietHeadline>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* SIDEBAR */}
            <nav className="md:col-span-3 border hairline-quiet self-start">
              {NAV.map((item, i) => (
                <button
                  key={item}
                  onClick={() => setActive(i)}
                  className={`block w-full text-left px-5 py-4 text-[13px] font-body border-b hairline-quiet-soft last:border-b-0 press ${
                    active === i
                      ? "bg-quiet text-black"
                      : i === 3
                      ? "text-pink/80 hover:bg-white/5 hover:text-pink"
                      : "text-quiet-dim hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>

            {/* PANEL */}
            <div className="md:col-span-9 border hairline-quiet p-8 md:p-12">
              {active === 0 ? (
                <div className="space-y-12">
                  <h2 className="font-display-quiet text-quiet text-[22px] border-b hairline-quiet-soft pb-5">
                    Profile
                  </h2>

                  <div>
                    <label
                      htmlFor="s-name"
                      className="block text-[12px] text-quiet-dim mb-4 font-body"
                    >
                      Display name
                    </label>
                    <input
                      id="s-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black text-quiet placeholder-white/30 focus:outline-none text-[16px] leading-[1.4] border hairline-quiet-soft focus:border-quiet p-4 transition-colors font-body"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="s-email"
                      className="block text-[12px] text-quiet-dim mb-4 font-body"
                    >
                      Email
                    </label>
                    <input
                      id="s-email"
                      type="email"
                      value={email}
                      readOnly
                      aria-readonly
                      className="w-full bg-black text-quiet-dim placeholder-white/30 focus:outline-none text-[16px] leading-[1.4] border hairline-quiet-soft p-4 font-body cursor-not-allowed"
                    />
                    <p className="mt-3 text-[12px] text-quiet-dim/80 font-body">
                      Email change requires re-auth. Contact support.
                    </p>
                  </div>

                  <fieldset>
                    <legend className="block text-[12px] text-quiet-dim mb-4 font-body">
                      Default style preferences
                    </legend>
                    <p className="-mt-1 mb-4 text-[11px] text-quiet-dim/80 font-body leading-[1.6]">
                      TatT remembers these on this device and starts your next
                      artist search with them already selected.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {STYLES.map((s) => {
                        const on = picked.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(s)}
                            className={`text-[12px] border hairline-quiet-soft px-4 py-3 press font-body text-left ${
                              on
                                ? "bg-quiet text-black border-quiet"
                                : "text-quiet hover:text-black hover:bg-quiet"
                            }`}
                          >
                            <span className="inline-block mr-2">{on ? "■" : "□"}</span>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="pt-8 border-t hairline-quiet-soft flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <button
                        onClick={handleSave}
                        disabled={!stylesHydrated}
                        className="press inline-flex items-center justify-center px-8 py-4 font-body text-[14px] leading-none bg-quiet text-black hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Save changes
                      </button>
                      {saved && (
                        <span className="text-[12px] text-quiet font-body">
                          Preferences saved
                        </span>
                      )}
                      {authError && (
                        <span className="text-[12px] text-pink font-body">
                          {authError}
                        </span>
                      )}
                    </div>
                    {user && (
                      <button
                        onClick={handleLogout}
                        className="text-[12px] text-quiet-dim hover:text-white border hairline-quiet px-5 py-3 press font-body"
                      >
                        Log out
                      </button>
                    )}
                  </div>
                  {hydrated && !user && (
                    <p className="text-[12px] text-quiet-dim font-body">
                      Your taste is saved on this device and will prefill artist
                      matching. To sync your profile too,&nbsp;
                      <a href={authDoorHref()} className="text-quiet underline underline-offset-4 hover:text-white">sign in</a>.
                    </p>
                  )}
                </div>
              ) : active === 1 ? (
                <div className="space-y-12">
                  <h2 className="font-display-quiet text-quiet text-[22px] border-b hairline-quiet-soft pb-5">
                    Notifications
                  </h2>
                  <div>
                    {NOTIF_OPTIONS.map((o) => (
                      <PunkToggle
                        key={o.key}
                        id={`notif-${o.key}`}
                        label={o.label}
                        description={o.description}
                        checked={!!notifs[o.key]}
                        onChange={(v) => setNotif(o.key, v)}
                        quiet
                      />
                    ))}
                  </div>
                  <p className="text-[12px] text-quiet-dim font-body">
                    Saved on your device. Email delivery lands with accounts v2.
                  </p>
                </div>
              ) : active === 2 ? (
                <div className="space-y-10">
                  <h2 className="font-display-quiet text-quiet text-[22px] border-b hairline-quiet-soft pb-5">
                    Billing
                  </h2>
                  <div className="border hairline-quiet-soft p-6">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-quiet-dim font-body">
                      Customer plan
                    </div>
                    <div className="mt-3 font-display-quiet text-[24px] text-quiet">
                      Free to design
                    </div>
                    <p className="mt-4 text-[13px] text-quiet-dim font-body leading-[1.8] max-w-xl">
                      There is no customer subscription to manage. You pay an
                      artist&apos;s deposit and TattTester&apos;s disclosed booking fee
                      only when you choose to book.
                    </p>
                    <Link
                      href="/pricing"
                      className="mt-6 inline-flex border hairline-quiet px-5 py-3 text-[12px] text-quiet hover:bg-quiet hover:text-black press font-body"
                    >
                      See the full breakdown&nbsp;→
                    </Link>
                  </div>
                  <p className="text-[12px] text-quiet-dim font-body leading-[1.7]">
                    Looking for a booking receipt? Open{" "}
                    <Link href="/bookings" className="text-quiet underline underline-offset-4 hover:text-white">
                      Your bookings
                    </Link>
                    . Artist plans are separate and listed on the pricing page.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  <h2 className="font-display-quiet text-quiet text-[22px] border-b hairline-quiet-soft pb-5">
                    Delete account
                  </h2>
                  <div className="border border-pink/50 p-6">
                    <div className="font-display-quiet text-[20px] text-quiet">
                      A real request, handled by a person
                    </div>
                    <p className="mt-4 text-[13px] text-quiet-dim font-body leading-[1.8] max-w-xl">
                      Account deletion is not self-serve yet. Email support
                      from the address on your account and ask us to delete it.
                      We will verify the request before removing account data.
                    </p>
                    <a
                      href="mailto:support@tatttester.com?subject=Account%20deletion%20request"
                      className="mt-6 inline-flex bg-pink text-black px-5 py-3 text-[12px] press font-body"
                    >
                      Request account deletion
                    </a>
                  </div>
                  <p className="text-[12px] text-quiet-dim font-body leading-[1.7]">
                    Read what deletion covers in the{" "}
                    <Link href="/legal/privacy" className="text-quiet underline underline-offset-4 hover:text-white">
                      privacy policy
                    </Link>
                    . Designs saved only on this browser may remain until you
                    clear this site&apos;s local storage.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
