import AvailabilityEditor from "./AvailabilityEditor";

// Ownership is proven by the API on every call; nothing here is cacheable.
export const dynamic = "force-dynamic";

export default async function ArtistAvailabilityPage({
  params,
}: {
  params: Promise<{ artistId: string }>;
}) {
  const { artistId } = await params;
  return <AvailabilityEditor artistId={artistId} />;
}
