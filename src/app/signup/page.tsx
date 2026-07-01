"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useUser } from "@/lib/tattStorage";

/** Punk form field per handoff: mono micro-label, hard 2px border,
 *  pink focus. */
function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] uppercase tracking-[0.24em] text-white/55 mb-3 font-body"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display"
      />
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp, error: authError } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setOauthError(null);
    const { signInWithGoogle } = await import("@/services/authService");
    try {
      await signInWithGoogle();
      router.push("/designs");
    } catch {
      setOauthError("Google sign-in didn't complete. Pop-up blocked?");
    }
  };

  return (
    <StudioShell footer={false}>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-140px)]">
        {/* BRAND PANEL */}
        <div className="relative hidden lg:block overflow-hidden border-r-2 hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.png"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="halftone absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#0a0a0a_10%,transparent_55%)]" />
          <div className="relative z-[2] h-full flex flex-col justify-end p-12">
            <div className="font-display text-white text-[64px] xl:text-[80px] leading-[0.88]">
              Think it.
              <br />
              <span className="slash"><span>Ink it</span></span>
              <span className="text-pink">.</span>
            </div>
            <p className="mt-8 max-w-sm text-[13px] leading-[1.6] text-white/70 font-body">
              &ldquo;Described my sleeve in one sentence, had four cuts before
              my coffee went cold. My artist worked straight off the
              stencil.&rdquo;
            </p>
            <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-pink font-body">
              ▸&nbsp;River&nbsp;M. — Pro member
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="px-6 md:px-12 py-14 md:py-20 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 font-body mb-8">
              <span>
                <span className="text-pink">●</span>&nbsp;&nbsp;Sign Up
              </span>
              <Link href="/login" className="hover:text-pink">
                Have account?&nbsp;Log In
              </Link>
            </div>

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
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@somewhere.com"
                autoComplete="email"
              />
              <Field
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />

              {(authError || oauthError) && (
                <div className="border-2 border-pink p-4 text-[11px] uppercase tracking-[0.2em] text-pink font-body leading-[1.5]">
                  ▸ {authError || oauthError}
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
              <button
                onClick={handleGoogle}
                className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-3 py-3 press font-body"
              >
                Google
              </button>
              {["Apple", "Github"].map((p) => (
                <button
                  key={p}
                  disabled
                  title="Coming soon"
                  className="text-[10px] uppercase tracking-[0.2em] text-white/30 border-2 hairline-soft px-3 py-3 font-body cursor-not-allowed"
                >
                  {p}&nbsp;·&nbsp;Soon
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
      </div>
    </StudioShell>
  );
}
