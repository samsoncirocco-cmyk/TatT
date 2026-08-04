import { notFound } from 'next/navigation';
import IntroClient from './IntroClient';
import { getRosterArtistById } from '@/lib/artists-graph';

export const dynamic = 'force-dynamic';

export default async function IntroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const artistId = typeof params.artistId === 'string' ? params.artistId : '';
  const artist = artistId ? await getRosterArtistById(artistId) : null;
  if (!artist || artist.bookingTier === 'bookable') notFound();
  return <IntroClient artist={{ id: artist.id, name: artist.name, slug: artist.slug }} />;
}
