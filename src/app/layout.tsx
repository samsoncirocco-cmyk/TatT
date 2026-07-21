import type { Metadata } from "next";
import "./globals.css";
import DemoModeBanner from "@/components/DemoModeBanner";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/components/AuthProvider";
import SignInPromptGate from "@/components/auth/SignInPromptGate";
import { ToastProvider } from "@/contexts/ToastContext";

export const metadata: Metadata = {
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
            {/* Page content — pb-24 reserves room for the bottom NavBar */}
            <div className="pb-24">
              {children}
            </div>
            {/* Persistent bottom navigation */}
            <NavBar />
            {/* Sign-in modal, shown on 401 AUTH_REQUIRED from any API call */}
            <SignInPromptGate />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
