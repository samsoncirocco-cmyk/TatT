import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TatT — Think it. Ink it.",
  description: "AI-powered tattoo design studio. Generate custom designs with AI, preview on your body in AR, and connect with verified artists near you.",
  keywords: ["tattoo", "AI", "design", "body art", "AR", "artist", "generate", "tattoo design", "AI tattoo"],
  authors: [{ name: "TatT" }],
  openGraph: {
    title: "TatT — Think it. Ink it.",
    description: "AI-powered tattoo design studio. Generate, preview in AR, connect with artists.",
    type: "website",
    siteName: "TatT",
  },
  twitter: {
    card: "summary_large_image",
    title: "TatT — Think it. Ink it.",
    description: "AI-powered tattoo design studio.",
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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased bg-[#050505] text-white selection:bg-[#FEE123]/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
