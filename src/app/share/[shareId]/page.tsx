import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SharePageClient } from './SharePageClient';

interface SharedDesign {
  shareId: string;
  /** Cover cut — the one Open Graph gets, since OG takes exactly one image. */
  imageUrl: string;
  /** Every cut in the share, cover first. Absent on pre-multi-cut shares. */
  imageUrls?: string[];
  prompt: string;
  style?: string;
  bodyPart?: string;
  sharedAt: string;
  views: number;
}

async function getDesign(shareId: string): Promise<SharedDesign | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tatt-app.vercel.app';
  try {
    const res = await fetch(`${baseUrl}/api/v1/designs/share/${shareId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const design = await getDesign(shareId);

  if (!design) {
    return { title: 'Design Not Found — TatT' };
  }

  // A share can hold several cuts. OG still takes exactly one image (the
  // cover), but the words a friend reads in the chat preview should say how
  // many they are actually about to see.
  const cutCount = design.imageUrls?.length ?? 1;
  const noun = cutCount > 1 ? `${cutCount} Tattoo Designs` : 'Tattoo Design';

  const title = design.style
    ? `${design.style} ${noun} — Made with TatT AI`
    : `AI ${noun} — Made with TatT`;

  const description =
    cutCount > 1
      ? `"${design.prompt}" — See all ${cutCount} ${design.style ?? 'custom'} tattoo cuts and create your own at TatT.`
      : `"${design.prompt}" — See this ${design.style ?? 'custom'} tattoo design and create your own at TatT.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: design.imageUrl,
          width: 1200,
          height: 630,
          alt: design.prompt,
        },
      ],
      type: 'website',
      siteName: 'TatT — AI Tattoo Studio',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [design.imageUrl],
      creator: '@tattapp',
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const design = await getDesign(shareId);

  if (!design) {
    notFound();
  }

  return <SharePageClient design={design} />;
}
