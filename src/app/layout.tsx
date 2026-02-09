import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
