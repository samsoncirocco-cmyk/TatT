"use client";

import Link from "next/link";
import FavoriteButton from "@/components/punk/FavoriteButton";
import { useFavorites } from "@/lib/tattStorage";

/**
 * Shared artist card — captures the inlined 3:4 tile + name + meta
 * pattern used on /artists, /matches, and the home featured grid.
 *
 * Variant matrix:
 *   - `compact`  : single style label below the tile (home grid)
 *   - `default`  : single style label inside the tile (/artists)
 *   - `match`    : style chip array below + optional match% sticker +
 *                  pink border when favorited + "Pinned" label
 *                  (/matches)
 *
 * The component preserves the inlined behavior exactly — adopting it
 * on the three existing sites should produce zero visual diff.
 */
type CommonProps = {
  slug: string;
  name: string;
  city: string;
  color: string;            // tailwind bg class, e.g. "bg-pink"
  href?: string;            // defaults to /artists/${slug}
  showFavorite?: boolean;   // defaults to false; /artists + /matches pass true
  favoriteSize?: number;    // forwards to FavoriteButton
  favoritePosition?: "top-right" | "top-left";
};

type CompactProps = CommonProps & {
  variant: "compact";
  style: string;
};

type DefaultProps = CommonProps & {
  variant?: "default";
  style: string;
};

type MatchProps = CommonProps & {
  variant: "match";
  styles: string[];
  matchPercent?: number;
};

type Props = CompactProps | DefaultProps | MatchProps;

function isMatch(p: Props): p is MatchProps {
  return p.variant === "match";
}

export default function ArtistCard(props: Props) {
  const {
    slug,
    name,
    city,
    color,
    href = `/artists/${slug}`,
    showFavorite = false,
    favoriteSize,
    favoritePosition = "top-right",
  } = props;

  const { favorites, hydrated } = useFavorites();
  const isFav = isMatch(props) && hydrated && favorites.includes(slug);

  const tileBorder = isFav ? "border-2 border-pink" : "border-2 hairline";

  return (
    <div className="relative group">
      <Link href={href} className="block press">
        <div className={`aspect-[3/4] ${color} ${tileBorder} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 mix-blend-multiply" />

          {/* match% sticker — match variant only. Inlined to preserve
              the original text-[11px] primary size (StickerPricetag's
              sm variant uses text-[10px], which would be a 1px diff). */}
          {isMatch(props) && typeof props.matchPercent === "number" && (
            <div className="absolute top-3 right-3 sticker px-2 py-1 z-10">
              <div className="font-display text-[11px] tracking-widest leading-none">
                {props.matchPercent}%
              </div>
              <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                Match
              </div>
            </div>
          )}

          {/* "Pinned" badge — match variant only, when favorited */}
          {isMatch(props) && isFav && (
            <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-pink font-body">
              ★ Pinned
            </span>
          )}

          {/* style label inside tile — default + compact variants
             show it bottom-left. Match variant uses chips outside. */}
          {!isMatch(props) && props.variant !== "compact" && (
            <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-white/80 font-body">
              {props.style}
            </span>
          )}
          {!isMatch(props) && props.variant === "compact" && (
            <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-white/80 font-body">
              {props.style}
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="font-display text-[20px] tracking-wide text-white group-hover:text-pink">
            {name}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
            {city}
          </div>

          {/* style chips — match variant only */}
          {isMatch(props) && props.styles && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {props.styles.map((s) => (
                <span
                  key={s}
                  className="text-[9px] uppercase tracking-[0.18em] text-white/70 border hairline px-2 py-1 font-body"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {showFavorite && (
        <FavoriteButton
          slug={slug}
          label={name}
          size={favoriteSize}
          className={`absolute ${
            favoritePosition === "top-left" ? "top-3 left-3" : "top-2 right-2"
          } z-10`}
        />
      )}
    </div>
  );
}
