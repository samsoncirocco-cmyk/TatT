"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useUser } from "@/lib/tattStorage";

const PROVIDERS = ["Google", "Apple", "Github"];

export default function SignupPage() {
  const router = useRouter();
  const { signUp, error: authError } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-md mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Sign Up</span>
          <Link href="/login" className="hover:text-pink">
            Have account?&nbsp;Log In
          </Link>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <SlashHeadline
            before="Join the"
            slashed="cult"
            sizeClassName="text-[48px] sm:text-[64px] leading-[0.88]"
          />
          <p className="mt-4 text-[14px] text-white/60 font-body leading-[1.55]">
            Free forever. Upgrade when you outgrow it.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim() || !password || submitting) return;
              setSubmitting(true);
              const user = await signUp(email, password);
              setSubmitting(false);
              if (user) router.push("/designs");
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
              <label
                htmlFor="password"
                className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
              >
                ▸ Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display"
              />
            </div>

            {authError && (
              <div className="border-2 hairline border-pink p-4 text-[11px] uppercase tracking-[0.2em] text-pink font-body leading-[1.5]">
                ▸ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="tape press inline-flex items-center justify-center w-full px-8 py-4 font-display text-[24px] leading-none tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating…" : "Create Account"}
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

          <p className="mt-12 text-[10px] uppercase tracking-[0.25em] text-white/40 font-body text-center">
            By signing up you agree to our&nbsp;
            <Link href="/legal/terms" className="text-pink hover:underline">
              Terms
            </Link>
            &nbsp;and&nbsp;
            <Link href="/legal/privacy" className="text-pink hover:underline">
              Privacy
            </Link>
            .
          </p>
        </div>
      </div>
    </StudioShell>
  );
}
