import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TatT - Think it. Ink it.",
  description: "AI-powered tattoo design studio. Generate custom tattoo designs with AI, visualize on your body with AR, and connect with verified artists.",
  keywords: ["tattoo", "AI", "design", "body art", "AR", "artist", "generate"],
  authors: [{ name: "TatT" }],
  openGraph: {
    title: "TatT - Think it. Ink it.",
    description: "AI-powered tattoo design studio",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
