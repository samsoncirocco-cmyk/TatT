import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://tatt-app.vercel.app'),
  title: {
    default: "TatT — AI Tattoo Design & AR Try-On",
    template: "%s | TatT"
  },
  description: "Generate custom tattoo designs with AI, preview them on your body in real-time AR, and connect with verified artists. The future of ink is here.",
  keywords: ["tattoo", "AI", "design", "body art", "AR", "augmented reality", "tattoo artist", "ink", "stable diffusion", "midjourney", "tattoo generator"],
  authors: [{ name: "TatT Team" }],
  creator: "TatT",
  publisher: "TatT",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "TatT — AI Tattoo Design & AR Try-On",
    description: "Think it. Ink it. Generate custom tattoos and preview them on your skin instantly.",
    url: 'https://tatt-app.vercel.app',
    siteName: 'TatT',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/hero.png',
        width: 1200,
        height: 630,
        alt: 'TatT - AI Tattoo Studio',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TatT — AI Tattoo Design & AR Try-On",
    description: "Think it. Ink it. Generate custom tattoos and preview them on your skin instantly.",
    images: ['/images/hero.png'],
    creator: "@tatt_app",
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
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
