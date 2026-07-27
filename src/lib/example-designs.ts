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
export interface ExampleDesign {
    src: string;
    style: string;
    alt: string;
}

export const EXAMPLE_DESIGNS: ExampleDesign[] = [
    {
        src: '/portfolio/artist_39_1768520785625_1.png',
        style: 'Blackwork / Dotwork',
        alt: 'AI-generated blackwork flower with dotwork shading and ornamental leaves',
    },
    {
        src: '/portfolio/artist_82_1768521419475_1.png',
        style: 'Neo-Traditional',
        alt: 'AI-generated neo-traditional crowned lion surrounded by roses',
    },
    {
        src: '/portfolio/artist_57_1768521126874_2.png',
        style: 'Watercolor / Geometric',
        alt: 'AI-generated watercolor mandala in pink and teal',
    },
    {
        src: '/portfolio/artist_53_1768521082894_1.png',
        style: 'Black & Grey Portrait',
        alt: 'AI-generated black and grey portrait of a woman with flowing hair',
    },
];
