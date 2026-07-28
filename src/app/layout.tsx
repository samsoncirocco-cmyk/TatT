import type { Metadata } from "next";
import "./globals.css";
import DemoModeBanner from "@/components/DemoModeBanner";
import { AuthProvider } from "@/components/AuthProvider";
import SignInPromptGate from "@/components/auth/SignInPromptGate";
import { ToastProvider } from "@/contexts/ToastContext";

export const metadata: Metadata = {
  // tatttester.com is the one canonical host (docs/brand/two-door-brand-guide.md,
  // TAT-46): every page's canonical tag points there, regardless of which
  // domain served it. The './' canonical resolves to each page's own path
  // against metadataBase; the Image2Ink landing overrides it with its own
  // absolute canonical (src/app/image2ink/page.tsx).
  metadataBase: new URL(
    `https://${process.env.CANONICAL_HOST ?? "tatttester.com"}`
  ),
  alternates: { canonical: "./" },
  title: "TatT — Think it. Ink it.",
  description: "AI-powered tattoo design and artist discovery — AR visualization coming soon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            {/* Demo mode banner — fixed top, only renders when NEXT_PUBLIC_DEMO_MODE=true */}
            <DemoModeBanner />
            {children}
            {/* Sign-in modal, shown on 401 AUTH_REQUIRED from any API call */}
            <SignInPromptGate />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
