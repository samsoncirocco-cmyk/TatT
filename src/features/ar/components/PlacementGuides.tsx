'use client';

/**
 * Placement guides — subtle silhouette outlines that give the mirror a sense
 * of scale.
 *
 * The #1 realism failure in AR try-ons is floating-sticker syndrome: a design
 * hanging in space at no particular size. These outlines let the user line
 * their arm up with a limb drawn at plausible proportion, so the design lands
 * at a believable size and position. Opt-in and OFF by default — the mirror
 * never draws anything on the user's body uninvited.
 *
 * Pure SVG, no tracking, no detection. The guide is a ruler, not a claim
 * about where the user's arm is.
 */

export type PlacementGuideId = 'forearm' | 'wrist' | 'upper-arm';

export interface PlacementGuide {
  id: PlacementGuideId;
  /** Short label for the toggle. */
  label: string;
  /** One-line hint shown while this guide is up. Loud register. */
  hint: string;
}

/** Cycle order for the toggle: off → forearm → wrist → upper arm → off. */
export const PLACEMENT_GUIDES: PlacementGuide[] = [
  {
    id: 'forearm',
    label: 'forearm',
    hint: 'line your forearm up with the outline — elbow at the top.',
  },
  {
    id: 'wrist',
    label: 'wrist',
    hint: 'wrist inside the band — small pieces live here.',
  },
  {
    id: 'upper-arm',
    label: 'upper arm',
    hint: 'shoulder at the top curve — this is big-piece territory.',
  },
];

/** The next guide in the cycle; null means off. */
export function nextGuide(current: PlacementGuideId | null): PlacementGuideId | null {
  if (current === null) return PLACEMENT_GUIDES[0].id;
  const index = PLACEMENT_GUIDES.findIndex((g) => g.id === current);
  const next = PLACEMENT_GUIDES[index + 1];
  return next ? next.id : null;
}

export function guideById(id: PlacementGuideId): PlacementGuide {
  const guide = PLACEMENT_GUIDES.find((g) => g.id === id);
  if (!guide) throw new Error(`Unknown placement guide: ${id}`);
  return guide;
}

const STROKE = 'rgba(255,255,255,0.35)';
const ZONE_STROKE = 'rgba(255,255,255,0.22)';

/**
 * Silhouette paths in a shared 200x400 viewBox, all vertical limbs.
 * Proportions are eyeballed from human averages (forearm ~1.5x wrist width,
 * upper arm broader with a shoulder curve), not anatomical claims.
 */
function GuideShape({ id }: { id: PlacementGuideId }) {
  switch (id) {
    case 'forearm':
      return (
        <>
          {/* Elbow (top, wider) tapering to wrist (bottom). */}
          <path
            d="M 55 30
               C 55 14, 145 14, 145 30
               L 132 340
               C 132 360, 68 360, 68 340
               Z"
            fill="none"
            stroke={STROKE}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          {/* Sweet spot: where a mid-size piece plausibly sits. */}
          <ellipse
            cx={100}
            cy={185}
            rx={34}
            ry={78}
            fill="none"
            stroke={ZONE_STROKE}
            strokeWidth={1.5}
            strokeDasharray="3 5"
          />
        </>
      );
    case 'wrist':
      return (
        <>
          {/* Lower forearm into the base of the hand. */}
          <path
            d="M 62 30
               L 70 250
               C 70 262, 60 268, 58 286
               C 56 310, 78 338, 100 338
               C 122 338, 144 310, 142 286
               C 140 268, 130 262, 130 250
               L 138 30
               C 138 16, 62 16, 62 30
               Z"
            fill="none"
            stroke={STROKE}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          {/* The band: the wrist zone itself. */}
          <path
            d="M 69 226 C 88 236, 112 236, 131 226"
            fill="none"
            stroke={ZONE_STROKE}
            strokeWidth={1.5}
            strokeDasharray="3 5"
          />
          <path
            d="M 66 262 C 88 272, 112 272, 134 262"
            fill="none"
            stroke={ZONE_STROKE}
            strokeWidth={1.5}
            strokeDasharray="3 5"
          />
        </>
      );
    case 'upper-arm':
      return (
        <>
          {/* Shoulder curve at the top, broad column to the elbow. */}
          <path
            d="M 45 90
               C 45 40, 100 18, 130 34
               C 152 46, 158 70, 156 96
               L 142 340
               C 142 360, 62 360, 62 340
               Z"
            fill="none"
            stroke={STROKE}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          {/* Big-piece zone on the outer arm. */}
          <ellipse
            cx={101}
            cy={190}
            rx={44}
            ry={95}
            fill="none"
            stroke={ZONE_STROKE}
            strokeWidth={1.5}
            strokeDasharray="3 5"
          />
        </>
      );
  }
}

/**
 * The overlay itself: centered, ~4/5 of the stage tall, never intercepting
 * a pointer — dragging the design straight through the guide must work.
 */
export default function PlacementGuides({ guide }: { guide: PlacementGuideId | null }) {
  if (!guide) return null;
  return (
    <div
      data-testid="placement-guide"
      data-guide={guide}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 200 400"
        className="h-[80%] max-h-full"
        role="presentation"
        focusable="false"
      >
        <GuideShape id={guide} />
      </svg>
    </div>
  );
}
