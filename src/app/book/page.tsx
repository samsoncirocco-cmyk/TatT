import BookClient, { type BookArtist } from "./BookClient";
import { getRosterArtistById } from "@/lib/artists-graph";
import { getArtistAvailability } from "@/lib/availability";
import { availabilityLabel } from "@/lib/booking";

// The artist comes from the live graph and availability from Firestore
// on every request — never statically rendered.
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const artistId = typeof sp.artistId === "string" ? sp.artistId : "";

  let artist: BookArtist | null = null;
  let artistLoadFailed = false;

  if (artistId) {
    try {
      const found = await getRosterArtistById(artistId);
      if (found) {
        const availability = await getArtistAvailability(found.id);
        artist = {
          id: found.id,
          slug: found.slug,
          name: found.name,
          location: found.location,
          shopName: found.shopName,
          styles: found.styles,
          availabilityStatus: availability.status,
          availabilityLabel: availabilityLabel(availability.status),
          availabilityNote: availability.note ?? null,
        };
      }
    } catch {
      // Graph unreachable — be honest about it instead of faking an artist.
      artistLoadFailed = true;
    }
  }

  return (
    <BookClient
      artist={artist}
      requestedArtistId={artistId}
      artistLoadFailed={artistLoadFailed}
    />
  );
}
