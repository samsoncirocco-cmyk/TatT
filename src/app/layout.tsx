import type { Metadata } from "next";
import "./globals.css";
import DemoModeBanner from "@/components/DemoModeBanner";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "TatT - Think it. Ink it.",
  description: "AI-powered tattoo design and artist discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <AuthProvider>
          <DemoModeBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
