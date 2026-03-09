import type { Metadata } from "next";
import "./globals.css";
import DemoModeBanner from "@/components/DemoModeBanner";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "TatT — Think it. Ink it.",
  description: "AI-powered tattoo design, AR visualization, and artist discovery.",
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
          {/* Demo mode banner — fixed top, only renders when NEXT_PUBLIC_DEMO_MODE=true */}
          <DemoModeBanner />
          {/* Page content — pb-24 reserves room for the bottom NavBar */}
          <div className="pb-24">
            {children}
          </div>
          {/* Persistent bottom navigation */}
          <NavBar />
        </AuthProvider>
      </body>
    </html>
  );
}
