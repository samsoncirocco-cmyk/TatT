"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import FormField from "@/components/punk/FormField";
import AuthBrandPanel from "@/components/punk/AuthBrandPanel";
import { useUser } from "@/lib/tattStorage";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, error: authError } = useUser();
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
        <AuthBrandPanel
          quote="Walked in with a prompt, walked out with a booked chair. The stencil was already in my artist's inbox."
          attribution="Dana K. — Free tier"
        />

        <div className="px-6 md:px-12 py-14 md:py-20 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 font-body mb-8">
              <span>
                <span className="text-pink">●</span>&nbsp;&nbsp;Log In
              </span>
              <Link href="/signup" className="hover:text-pink">
                New here?&nbsp;Sign Up
              </Link>
            </div>

            <SlashHeadline
              before="Welcome"
              slashed="back"
              sizeClassName="text-[48px] sm:text-[64px] leading-[0.88]"
            />
            <p className="mt-4 text-[14px] text-white/60 font-body leading-[1.55]">
              Pick up where you left off.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!email.trim() || !password || submitting) return;
                setSubmitting(true);
                const user = await signIn(email, password);
                setSubmitting(false);
                if (user) router.push("/designs");
              }}
              className="mt-10 space-y-6"
            >
              <FormField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@somewhere.com"
                autoComplete="email"
              />
              <FormField
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
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
                {submitting ? "Signing in…" : "Log In"}
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
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
