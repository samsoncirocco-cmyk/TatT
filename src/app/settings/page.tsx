"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import PunkToggle from "@/components/punk/PunkToggle";
import { useUser } from "@/lib/tattStorage";
import { CANONICAL_STYLES } from "@/lib/style-vocabulary";

const NAV = ["Profile", "Notifications", "Billing", "Delete Account"];

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
  const [active, setActive] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>(["Fine Line", "Blackwork"]);
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIF_OPTIONS.map((o) => [o.key, o.default])),
  );

  // Sync local form state from store on hydration / user change.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration sync from localStorage, same pattern as useStoredList
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
    if (!user) return;
    await updateUser({ name: name.trim() || undefined });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Settings</span>
          <span>Account:&nbsp;<span className="text-pink">Pro</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-white text-[40px] sm:text-[64px] leading-[0.88] tracking-[0.005em]">
            Settings<span className="text-pink">.</span>
          </h1>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* SIDEBAR */}
            <nav className="md:col-span-3 border-2 hairline self-start">
              {NAV.map((item, i) => (
                <button
                  key={item}
                  onClick={() => setActive(i)}
                  className={`block w-full text-left px-5 py-4 text-[10px] uppercase tracking-[0.25em] font-body border-b hairline-soft last:border-b-0 press ${
                    active === i
                      ? "bg-pink text-black"
                      : i === 3
                      ? "text-pink hover:bg-pink hover:text-black"
                      : "text-white/70 hover:bg-white/5 hover:text-pink"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>

            {/* PANEL */}
            <div className="md:col-span-9 border-2 hairline p-6 md:p-10">
              {active === 0 ? (
                <div className="space-y-8">
                  <h2 className="font-display text-white text-[28px] tracking-wide border-b-2 hairline pb-4">
                    Profile
                  </h2>

                  <div>
                    <label
                      htmlFor="s-name"
                      className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
                    >
                      ▸ Display Name
                    </label>
                    <input
                      id="s-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="s-email"
                      className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
                    >
                      ▸ Email
                    </label>
                    <input
                      id="s-email"
                      type="email"
                      value={email}
                      readOnly
                      aria-readonly
                      className="w-full bg-black text-white/50 placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline-soft p-4 font-display cursor-not-allowed"
                    />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
                      Email change requires re-auth. Contact support.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                      ▸ Default Style Preferences
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {STYLES.map((s) => {
                        const on = picked.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => toggle(s)}
                            className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-3 press font-body text-left ${
                              on
                                ? "bg-pink text-black border-pink"
                                : "text-white/70 hover:text-black hover:bg-pink"
                            }`}
                          >
                            <span className="inline-block mr-2">{on ? "■" : "□"}</span>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t hairline flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <button
                        onClick={handleSave}
                        disabled={!user}
                        className={`tape press inline-flex items-center justify-center px-8 py-4 font-display text-[24px] leading-none tracking-[0.02em] ${
                          !user ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        Save Changes
                        <span className="ml-3 text-[18px]">▸</span>
                      </button>
                      {saved && (
                        <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body">
                          ● Saved
                        </span>
                      )}
                      {authError && !saved && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-pink font-body">
                          ▸ {authError}
                        </span>
                      )}
                    </div>
                    {user && (
                      <button
                        onClick={handleLogout}
                        className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
                      >
                        Log Out
                      </button>
                    )}
                  </div>
                  {hydrated && !user && (
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-body">
                      Not signed in. Demo sign-in:&nbsp;
                      <a href="/login" className="text-pink hover:underline">log in</a>.
                    </p>
                  )}
                </div>
              ) : active === 1 ? (
                <div className="space-y-8">
                  <h2 className="font-display text-white text-[28px] tracking-wide border-b-2 hairline pb-4">
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
                      />
                    ))}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
                    Saved on your device. Email delivery lands with accounts v2.
                  </p>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="font-display text-[28px] text-white/40 tracking-wide">
                    {NAV[active]}
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/30 font-body">
                    Coming soon
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
