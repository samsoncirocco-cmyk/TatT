import { notFound } from 'next/navigation';
import Link from 'next/link';
import IntroClient from './IntroClient';
import { getRosterArtistById } from '@/lib/artists-graph';

export const dynamic = 'force-dynamic';

export default async function IntroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const artistId = typeof params.artistId === 'string' ? params.artistId : '';
  // Design-session id threaded from /book?ds=… (browse-only redirect) so the
  // relay request can carry the same Brief as the deposit path.
  const designSessionId = typeof params.ds === 'string' ? params.ds : '';

  let artist = null;
  try {
    artist = artistId ? await getRosterArtistById(artistId) : null;
  } catch {
    // Graph outage is not "artist missing" — match /book's retry-oriented copy.
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xl">Couldn&apos;t reach the artist graph.</p>
          <p className="mt-4 text-sm text-white/60">
            The live roster is unreachable right now — try again in a minute.
          </p>
          <p className="mt-8">
            <Link href="/artists" className="underline text-sm">
              Browse the roster
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (!artist || artist.bookingTier === 'bookable') notFound();
  return (
    <IntroClient
      artist={{ id: artist.id, name: artist.name, slug: artist.slug }}
      designSessionId={designSessionId}
    />
  );
}
