"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import { useDemoUser } from "@/lib/tattStorage";

const PROVIDERS = ["Google", "Apple", "Github"];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useDemoUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-md mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Log In</span>
          <Link href="/signup" className="hover:text-pink">
            New here?&nbsp;Sign Up
          </Link>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <h1 className="font-display text-white text-[48px] sm:text-[64px] leading-[0.88] tracking-[0.005em]">
            Welcome&nbsp;<span className="slash"><span>back</span></span>
            <span className="text-pink">.</span>
          </h1>
          <p className="mt-4 text-[14px] text-white/60 font-body leading-[1.55]">
            Pick up where you left off.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim() || !password) return;
              signIn(email);
              router.push("/designs");
            }}
            className="mt-10 space-y-6"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
              >
                ▸ Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@somewhere.com"
                className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor="password"
                  className="block text-[10px] uppercase tracking-[0.28em] text-pink font-body"
                >
                  ▸ Password
                </label>
                <button
                  type="button"
                  onClick={() => console.log("forgot")}
                  className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-pink font-body"
                >
                  Forgot?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display"
              />
            </div>

            <button
              type="submit"
              className="tape press inline-flex items-center justify-center w-full px-8 py-4 font-display text-[24px] leading-none tracking-[0.02em]"
            >
              Log In
              <span className="ml-3 text-[18px]">▸</span>
            </button>
          </form>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex-1 border-t hairline" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-body">
              Or continue with
            </span>
            <div className="flex-1 border-t hairline" />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                onClick={() => console.log("oauth", p)}
                className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-3 py-3 press font-body"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
