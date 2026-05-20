"use client";

import { useFavorites } from "@/lib/tattStorage";

/**
 * Sharpie-style heart toggle. Pink fill when on, hairline outline when off.
 * The path is intentionally irregular — drawn with a slightly off-axis
 * second lobe and a wobbly tip to read as marker, not generic emoji.
 */
type Props = {
  slug: string;
  label?: string;
  size?: number;
  className?: string;
};

export default function FavoriteButton({
  slug,
  label,
  size = 28,
  className = "",
}: Props) {
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const on = hydrated && isFavorite(slug);

  return (
    <button
      type="button"
      aria-label={
        on
          ? `Remove ${label ?? slug} from favorites`
          : `Add ${label ?? slug} to favorites`
      }
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(slug);
      }}
      className={`press inline-flex items-center justify-center bg-black/80 border hairline hover:border-pink ${className}`}
      style={{ width: size + 12, height: size + 12 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={on ? "text-pink" : "text-white/80"}
        aria-hidden="true"
      >
        {/* Sharpie heart — two lobes intentionally uneven, tip pulled slightly right */}
        <path d="M16 27 C 5 19, 3 11, 9 7 C 13 4, 16 8, 16 11 C 16 7, 20 4, 24 7 C 30 11, 28 19, 17 27 Z" />
      </svg>
    </button>
  );
}
