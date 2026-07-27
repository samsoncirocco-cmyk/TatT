import { redirect } from "next/navigation";

/**
 * The Forge retired as a destination (ADR-0028): /design is the one
 * consumer design entry, and its fast lane runs direct prompts through the
 * Council before generation — the raw generateTattooDesign bypass this page
 * carried is the quality gap that decision closed. Old deep links keep
 * working: ?prompt= (saved-design "Iterate" URLs, shares) is forwarded so
 * the prompt lands as the design session's first message.
 */
export default async function StencilPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string | string[] }>;
}) {
  const { prompt } = await searchParams;
  const value = Array.isArray(prompt) ? prompt[0] : prompt;
  redirect(value ? `/design?prompt=${encodeURIComponent(value)}` : "/design");
}
