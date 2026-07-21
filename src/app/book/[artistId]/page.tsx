import { redirect } from "next/navigation";

/**
 * Legacy route — the old-theme booking page lived here with fabricated
 * Math.random() availability. The punk /book flow replaced it; keep the
 * URL working for old links and Stripe cancel_urls.
 */
export default async function LegacyBookArtistPage({
  params,
}: {
  params: Promise<{ artistId: string }>;
}) {
  const { artistId } = await params;
  redirect(`/book?artistId=${encodeURIComponent(artistId)}`);
}
