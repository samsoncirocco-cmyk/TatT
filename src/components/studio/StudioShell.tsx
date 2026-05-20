"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFavorites, useDemoUser } from "@/lib/tattStorage";

type StudioShellProps = {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
};

const NAV = [
  { label: "Forge", href: "/generate" },
  { label: "Artists", href: "/artists" },
  { label: "My Designs", href: "/designs" },
  { label: "Pricing", href: "/pricing" },
];

export default function StudioShell({
  children,
  leftSidebar,
  rightSidebar,
}: StudioShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const { favorites, hydrated: favHydrated } = useFavorites();
  const { user, hydrated: userHydrated, signOut } = useDemoUser();

  return (
    <div className="halftone grain min-h-screen text-white font-body flex flex-col relative bg-black">
      <header className="relative z-20 border-b-2 hairline bg-black">
        <div className="flex items-stretch justify-between">
          <div className="flex items-center px-5 sm:px-8 py-4 gap-6">
            <Link href="/" className="flex items-center">
              <span className="font-display text-white text-3xl leading-none tracking-[0.01em] glitch">
                TA<span className="text-pink">TT</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              {NAV.map((n) => {
                const active = pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href));
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`text-[10px] uppercase tracking-[0.25em] font-body press ${
                      active ? "text-pink" : "text-white/70 hover:text-pink"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-stretch">
            {favHydrated && favorites.length > 0 && (
              <Link
                href="/matches"
                aria-label={`${favorites.length} favorited artists`}
                className="hidden md:flex items-center px-4 border-l hairline-white text-[10px] uppercase tracking-[0.25em] text-pink hover:text-white press tabular-nums font-body"
              >
                ♥&nbsp;{favorites.length}
              </Link>
            )}
            <div className="hidden md:flex items-stretch relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                aria-label="Account"
                aria-expanded={accountOpen}
                className="px-4 flex items-center justify-center border-l hairline-white text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink press max-w-[220px]"
              >
                <span className="truncate">
                  {userHydrated && user
                    ? user.email
                    : userHydrated
                    ? "Sign In"
                    : "Account"}
                </span>
                <span className="text-pink ml-2">▾</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-0 w-64 bg-black border-2 hairline z-30">
                  {userHydrated && user ? (
                    <>
                      <div className="px-5 py-3 border-b hairline-soft">
                        <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-body">
                          Signed in as
                        </div>
                        <div className="mt-1 text-[12px] text-pink font-body truncate">
                          {user.name || user.email}
                        </div>
                      </div>
                      <Link
                        href="/designs"
                        onClick={() => setAccountOpen(false)}
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink hover:bg-white/5 border-b hairline-soft font-body"
                      >
                        My Designs
                      </Link>
                      <Link
                        href="/bookings"
                        onClick={() => setAccountOpen(false)}
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink hover:bg-white/5 border-b hairline-soft font-body"
                      >
                        My Bookings
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setAccountOpen(false)}
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink hover:bg-white/5 border-b hairline-soft font-body"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setAccountOpen(false);
                        }}
                        className="block w-full text-left px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-pink hover:bg-pink hover:text-black font-body"
                      >
                        Log Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setAccountOpen(false)}
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink hover:bg-white/5 border-b hairline-soft font-body"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setAccountOpen(false)}
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink hover:bg-white/5 border-b hairline-soft font-body"
                      >
                        Sign Up
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setAccountOpen(false)}
                        className="block px-5 py-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink hover:bg-white/5 font-body"
                      >
                        Settings
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
              className="md:hidden w-12 flex items-center justify-center border-l hairline-white text-white/70 hover:text-pink press"
            >
              <span className="material-symbols-outlined">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t hairline bg-black">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                className="block px-6 py-4 text-[12px] uppercase tracking-[0.25em] text-white/80 hover:text-pink border-b hairline-soft font-body"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block px-6 py-4 text-[12px] uppercase tracking-[0.25em] text-pink border-b hairline-soft font-body"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block px-6 py-4 text-[12px] uppercase tracking-[0.25em] text-pink font-body"
            >
              Sign Up
            </Link>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-[2]">
        {leftSidebar && (
          <aside className="hidden lg:block w-60 shrink-0 border-r hairline-white bg-black">
            {leftSidebar}
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto bg-black">{children}</main>

        {rightSidebar && (
          <aside className="hidden xl:block w-80 shrink-0 border-l hairline-white relative bg-black">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
