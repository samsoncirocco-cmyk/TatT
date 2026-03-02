import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SharePageClient } from './SharePageClient';

interface SharedDesign {
  shareId: string;
  imageUrl: string;
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
  params: { shareId: string };
}): Promise<Metadata> {
  const design = await getDesign(params.shareId);

  if (!design) {
    return { title: 'Design Not Found — TatT' };
  }

  const title = design.style
    ? `${design.style} Tattoo Design — Made with TatT AI`
    : 'AI Tattoo Design — Made with TatT';

  const description = `"${design.prompt}" — See this ${design.style ?? 'custom'} tattoo design and create your own at TatT.`;

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

export default async function SharePage({ params }: { params: { shareId: string } }) {
  const design = await getDesign(params.shareId);

  if (!design) {
    notFound();
  }

  return <SharePageClient design={design} />;
}
