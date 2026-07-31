import { redirect } from "next/navigation";

/**
 * The Studio moved to /studio (TAT-54). ADR-0028 flagged the crossed names —
 * the Studio at /generate, the retired Forge at /generate/stencil — as
 * deferred cleanup; this is that cleanup. ADR-0038 names the room's job
 * (refinement), and the path now says so.
 *
 * Every query param is forwarded, so a carried design id (?design=…) and
 * any old deep link survive the hop. /generate/stencil keeps its own
 * redirect into /design — the Forge stays retired.
 */
export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const one of Array.isArray(value) ? value : [value]) {
      forwarded.append(key, one);
    }
  }
  const query = forwarded.toString();
  redirect(query ? `/studio?${query}` : "/studio");
}
