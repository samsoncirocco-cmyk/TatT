// Demo-mode mock images — the single source for every surface that
// substitutes free stock renders when NEXT_PUBLIC_DEMO_MODE is on:
// /api/v1/generate and the design-session orchestrator
// (src/services/designSession/internal/orchestrator.ts).
//
// Repo-local, not third-party URLs. These were four Unsplash photos until
// two of them 404'd, which showed up as two blank tiles in the design-session
// reveal — a silent failure at the beat the whole session builds to. Local
// files cannot rot (src/lib/demo-images.test.ts fails if one goes missing)
// and, being same-origin, they do not taint a canvas the way a cross-origin
// image does.
//
// Every entry is flash art on a plain white background, matching what the
// real generation path is pinned to produce (presentationClause() in
// src/services/council/internal/structuredMode.ts). A demo render
// photographed on skin would misrepresent the product AND break the
// placement preview, which strips the white background to alpha.
export const DEMO_MOCK_IMAGES = [
    '/portfolio/artist_39_1768520785625_1.png',
    '/portfolio/artist_82_1768521419475_1.png',
    '/portfolio/artist_57_1768521126874_2.png',
    '/portfolio/artist_53_1768521082894_1.png',
];
