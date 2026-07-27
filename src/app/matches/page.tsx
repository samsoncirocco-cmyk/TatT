import { redirect } from "next/navigation";
import { parseStylesParam } from "@/lib/design-style-signal";

/**
 * /matches is retired (ADR-0029): the deck chain (/smart-match → /swipe)
 * is the funnel's Match step, and /artists is the one browse/compare
 * list surface. This stub keeps old deep links working by mapping the
 * design handoff (?styles=…&from=design) onto the directory's
 * single-style filter — the strongest carried style wins, garbage
 * degrades to the unfiltered roster.
 */
export default async function MatchesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const styles = parseStylesParam(typeof sp.styles === "string" ? sp.styles : null);
  redirect(
    styles.length
      ? `/artists?${new URLSearchParams({ style: styles[0] }).toString()}`
      : "/artists",
  );
}
