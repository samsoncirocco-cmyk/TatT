/**
 * Slug scheme for real graph artists (string ids `artist_*`).
 *
 * 1,037 artist names collide in the live graph, so slugs MUST embed the
 * unique id. Format: `<kebab-name>--<id>` — the id follows the first
 * `--` separator verbatim (ids may contain dots/underscores that a
 * kebab pass would destroy, so the id is never transformed).
 *
 * A bare id is also accepted by the resolver, so `/artists/artist_foo`
 * deep-links work without knowing the artist's name.
 *
 * Client-safe: no server/driver imports.
 */

export function kebab(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Build the canonical profile slug for an artist. */
export function artistSlug(name: string, id: string): string {
  const k = kebab(name);
  return k ? `${k}--${id}` : id;
}

/**
 * Extract the artist id from a profile slug.
 * Accepts `<kebab-name>--<id>` or a bare id.
 */
export function artistIdFromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug);
  const sep = decoded.indexOf("--");
  return sep === -1 ? decoded : decoded.slice(sep + 2);
}
