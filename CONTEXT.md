# TatT

AI-powered tattoo design platform: AI design generation, AR preview, and
artist matching.

## Language

**Generation**:
The pipeline that turns a user's idea into tattoo design images. One module,
one public entry point; callers never see which image provider ran.
_Avoid_: image service, SDXL pipeline

**Provider**:
A hidden backend inside the generation module that actually produces images
(Replicate SDXL, Vertex Imagen). Only the generation module knows providers
exist.
_Avoid_: model service, vendor client

**Council**:
The prompt-enhancement step that sharpens a user's idea before generation
(multi-agent Gemini simulation). Its own module with its own entry point;
generation is one of its callers.
_Avoid_: enhancer, prompt service

**Matching**:
Finding the right artist for a design via vector, graph, and real-time
signals. Not yet a deep module; see todolist.md.
_Avoid_: search, recommendations

**TattTester**:
The primary consumer brand and the one product everyone signs up for.
Trust angle: test a tattoo on your own body before it's forever.
_Avoid_: TatT (internal repo name only), Tattoo Tester

**Image2Ink**:
The design-generator feature inside TattTester, and the discovery-angle
marketing door at image2ink.com that funnels into TattTester. Not a
separate brand, signup, or product. See docs/brand/two-door-brand-guide.md.
_Avoid_: treating it as a second brand

**Door**:
A marketing entry point matched to one customer state. Two exist:
TattTester (trust: "will it look good on me, forever?") and Image2Ink
(discovery: "no idea what I'd get"). Both lead to the same product.
_Avoid_: sub-brand, funnel (a door is the top of the funnel, not the funnel)

**First-timer**:
The core audience: 18-35, getting (or considering) their first tattoo,
found via TikTok/IG. Consumer-first voice; artists get a separate pitch.
_Avoid_: user, customer (when the audience matters, say first-timer)
