// Example designs for the homepage showcase — the no-signup product preview
// that replaced the retired /demo walkthrough (TAT-36).
//
// Honest-UI rules for this list (same spirit as the /gallery empty state):
// every entry is a REAL output of the TatT generation pipeline
// (scripts/generate-artist-images.js → Replicate SDXL), labeled as an
// AI-generated example. Nothing here may be presented as community-shared
// work, carry fake view counts, or be attributed to a real artist.
//
// Repo-local paths only — example-designs.test.ts pins each file's
// existence so a missing asset fails the build-time check, not the page.
//
// The srcs point at web-optimized 640px WebP copies (~50 KB each, generated
// by scripts/optimize-showcase-images.mjs) rather than the raw ~1 MB
// 1024x1024 pipeline PNGs, which stay in public/portfolio/ for demo mode
// (src/lib/demo-images.ts) and the placement preview. The tiles render at
// ~264 CSS px, so 640px covers 2x retina with headroom.
export interface ExampleDesign {
    src: string;
    style: string;
    alt: string;
}

export const EXAMPLE_DESIGNS: ExampleDesign[] = [
    {
        src: '/portfolio/web/artist_39_1768520785625_1.webp',
        style: 'Blackwork / Dotwork',
        alt: 'AI-generated blackwork flower with dotwork shading and ornamental leaves',
    },
    {
        src: '/portfolio/web/artist_82_1768521419475_1.webp',
        style: 'Neo-Traditional',
        alt: 'AI-generated neo-traditional crowned lion surrounded by roses',
    },
    {
        src: '/portfolio/web/artist_57_1768521126874_2.webp',
        style: 'Watercolor / Geometric',
        alt: 'AI-generated watercolor mandala in pink and teal',
    },
    {
        src: '/portfolio/web/artist_53_1768521082894_1.webp',
        style: 'Black & Grey Portrait',
        alt: 'AI-generated black and grey portrait of a woman with flowing hair',
    },
];
