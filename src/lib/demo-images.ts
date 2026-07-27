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

// Demo-mode artist PORTFOLIO images — what the mock matched artists show as
// their past work (match-pulse neo4jService / demoMatchService and
// firebase-match-service). Same rot story as above: these surfaces pointed at
// the same four Unsplash photos until two 404'd. Kept disjoint from
// DEMO_MOCK_IMAGES so a demo never shows an artist "already having tattooed"
// the design it just generated; demo-images.test.ts pins both properties.
//
// Index order matches the recurring mock personas: 0 Luna Martinez
// (neo-traditional), 1 Kai Chen (Japanese), 2 River Thompson
// (blackwork/minimalist), 3 Alex Storm (bold traditional color).
export const DEMO_PORTFOLIO_IMAGES = [
    '/portfolio/artist_18_1768520534952_0.png',
    '/portfolio/artist_11_1768520426794_0.png',
    '/portfolio/artist_27_1768520643269_0.png',
    '/portfolio/artist_30_1768520677564_0.png',
];

// Demo-mode artist AVATARS (demoMatchService mock matches). These replaced
// i.pravatar.cc URLs, which served photographs of real strangers as "our
// artists" and could rot exactly like the Unsplash links did. Repo-local
// initial marks in the site palette instead. NOT design imagery — the
// flash-on-white rule above does not apply; the test only pins existence.
//
// Index order matches getMockMatches: 0 Alex Rivera, 1 Jordan Chen,
// 2 Sam Taylor, 3 Morgan Lee, 4 Casey Brooks.
export const DEMO_AVATAR_IMAGES = [
    '/avatars/demo-alex-rivera.svg',
    '/avatars/demo-jordan-chen.svg',
    '/avatars/demo-sam-taylor.svg',
    '/avatars/demo-morgan-lee.svg',
    '/avatars/demo-casey-brooks.svg',
];
