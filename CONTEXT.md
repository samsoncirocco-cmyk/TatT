# TatT (rebranding to TattTester)

AI-powered tattoo design platform: AI design generation, AR preview, and
artist matching. Sells trust to first-time tattoo getters; revenue is model
access, artist bookings, and artist-side subscriptions — not design sales.

## Language

### Brand

**TattTester**:
The primary consumer brand and the one product everyone signs up for
(ADR-0004). Promises the test: see it, wear it, trust it before it's forever.
_Avoid_: TatT (internal repo name only), Tatt Tester (two words), Tattoo
Tester, Image2Ink (as a brand name)

**Tatt-T**:
Spoken/DBA nickname for TattTester. Never the front door (sounds like
"tatty").

**Image2Ink**:
The design-generator feature inside TattTester, and the discovery-angle
marketing door at image2ink.com that funnels into TattTester. Not a separate
brand, signup, or product. See docs/brand/two-door-brand-guide.md.
_Avoid_: treating it as a second brand or the company name

**Door**:
A marketing entry point matched to one customer state. Two exist:
TattTester (trust: "will it look good on me, forever?") and Image2Ink
(discovery: "no idea what I'd get"). Both lead to the same product.
_Avoid_: sub-brand, funnel (a door is the top of the funnel, not the funnel)

**First-timer**:
The primary customer: 18–35, getting (or considering) their first tattoo,
afraid of regret and of their own lack of artistic ability; found via
TikTok/IG. The front door speaks to them; artists get a separate pitch.
_Avoid_: user, customer (when the audience or emotional state matters)

### Design system (ADR-0035, ADR-0036)

**Register**:
Which volume a surface speaks at. Two exist: Loud (the punk face — discovery
and design surfaces) and Quiet (the calm hands — every commitment surface:
money, identity, legal). The register flips at commitment, not before.
_Avoid_: theme, mode (registers share one dark theme)

**Quiet dark**:
The Quiet register's look: the same black world with the volume down — warm
grays, generous space, at most one pink accent, no tape/sticker/slash. Never
a light-theme page; a light receipt card is the one sanctioned accent.
_Avoid_: light mode, dark mode (it isn't a toggle)

**Money sentence**:
The one visible sentence every money surface must carry: who pays what, who
keeps what (ADR-0007 as copy law). Quiet voice, no exceptions without an ADR.

**Provenance label**:
The plain statement on every unclaimed artist profile: unclaimed, work shown
from the artist's public Instagram with credit, plus the claim door. Wording
pending counsel; stance locked.
_Avoid_: "unclaimed" badge with no explanation

### Product

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

**One door**:
The single consumer design entry at `/design` (ADR-0028): one input that
accepts talking or typing. Vague input runs intake; a complete prompt takes
the fast lane. Every CTA points here.
_Avoid_: choosing between design surfaces in nav or marketing

**Fast lane**:
The direct-prompt path inside the one door (ADR-0028): a complete prompt
skips the conversation — never the Council — and lands on the shared four-cut
reveal, still producing a Brief. Absorbs the Forge (ADR-0018, superseded as a
destination); the Forge name leaves the UI.
_Avoid_: Forge (retired from UI), raw prompt (Council always runs)

**Studio**:
The refinery: the room where a picked design goes from *almost* to *yes*
(ADR-0038, closing ADR-0017's open verdict). Entered from a picked design,
never from cold; sheds prompting and style choice to the one door (ADR-0028),
keeps inpainting, cleanup, layers, versions, stencil export.
_Avoid_: Forge (its old name), editor page, "the generator" (that's the one door)

**Gear**:
One of the Studio's three ranked depths, not three doors: point and say
(default), plain-language tools (one tap), the full bench (explicit door).
Deeper gears never crowd shallower ones.
_Avoid_: mode, tab

**Point and say**:
The Studio's default surface: circle the part that's wrong, say what's wrong,
SketchBot redraws only that region. The product's conversation zoomed into one
square inch — tools run underneath, unshown.
_Avoid_: inpainting (that's the machinery, not the experience)

**Fix allowance**:
The bounded, env-tunable number of refinement generations a design carries in
the Studio. Drawn from the global budget; the ceiling is spoken in voice and
ends in a booking prompt, never a paywall (ADR-0038, ADR-0030).
_Avoid_: credits, quota

**Artist console**:
The artist-side home at `/console`: bookings and status history, availability,
and payout status (ADR-0031). Identity is resolved from the signed-in user; it
is the free rung the paid artist plan later expands from.
_Avoid_: dashboard (`/dashboard` is the consumer design-library redirect), CRM
(that's the paid rung)

### Design bot (ADR-0009–0016)

**Confidence layer**:
What the consumer flow sells: enough certainty to book an artist, not a
finished design. Bot, reveal, and canvas exist to move a first-timer from
"vague idea" to "I know what I want and who should do it."
_Avoid_: design tool, AI art generator

**SketchBot**:
The named design consultant on `/design` (TAT-48): the user-facing identity
the intake bot speaks as — header, opener, and persona all say SketchBot, in
the pop-punk confidant voice (ADR-0035/0036) while ADR-0023's rules govern
how it talks. Keeps a live notepad of the brief beside the chat (only
user-meaningful fields — never rationale or telemetry); "talk with
SketchBot" is the marketing hook.
_Avoid_: the bot / the assistant (in user-facing copy), Forge bot

**Intake**:
The conversation that starts a design session (ADR-0019): the bot opens on
placement and meaning, then genuinely converses — follow-ups, threads —
filling the intake record as a side effect. Never labeled fields; the
scripted two-question version (ADR-0009) survives only as the LLM-down
degraded mode.
_Avoid_: form, questionnaire, prompt box

**Consultant voice**:
How the bot talks (ADR-0023): no validation prefixes, one question at a
time, meaning paraphrased back rather than stitched in verbatim. Vague
answers get a concrete contrast ("inner or outer?"), never generic filler.
ADR-0023 is also the single source for the Flux/Krea routing table, the
aspect-ratio-by-placement map, and the IP/character rule.
_Avoid_: script, tone guidelines

**Proposal**:
The announce-and-confirm beat that ends intake (ADR-0020): the bot plays
back what it heard in one line and generates the reveal on the user's yes.
_Avoid_: auto-fire, "generating…" (the user consents first)

**Warm handoff**:
The turn-20 exit (ADR-0021): a user who can't converge is steered to
artists offering free consultations — framed as the bot's judgment call,
never as a limit the user hit.
_Avoid_: timeout, limit, failure state

**Brief**:
The structured record a session produces for the artist: placement, closed
style tags, freeform emotional context, the picked design, references, and
any flagged placement concerns. The product's real deliverable; travels with
the booking. The artist creates the design — the brief informs it.
_Avoid_: prompt, spec, "the design"

**Style ontology**:
The closed, human-curated set of style tags shared by extraction and the
artist graph (ADR-0010, ADR-0011). Matching runs on it; nothing enters it
without human approval.
_Avoid_: tag list, labels

**Variation axis**:
One dimension of deliberate divergence across a reveal's four designs
(bold↔fine, color↔blackwork, literal↔abstract, minimal↔ornate). The
questionnaire in disguise: a pick answers the axes without asking (ADR-0012).

**Reveal**:
The four-design moment ending the bot's autonomous run. Its job depends on
intake: questionnaire when style is ambiguous, confidence proof
(compositional variations) when style is resolved (ADR-0012).

**Most-not-you tap**:
The one extra selection after the pick — "which feels most *not* you" —
yielding one clean negative signal instead of three noisy non-picks.

**Refinement round**:
The single post-pick loop: pick → most-not-you tap → one refinement question
→ one regeneration. Exactly one round, hard stop (ADR-0013); the canvas and
the artist consult own everything after.
_Avoid_: iteration (implies unbounded)

**Re-cut**:
What plain criticism produces after the reveal (ADR-0039): the user says
what's wrong — "riku's missing", "too busy", "the third one but less color"
— and one cut is drawn again on the pinned model with their words folded in.
Composition-level, which is what separates it from the Studio's point and
say; bounded by the same fix allowance and closed once the Brief exists.
_Avoid_: regenerate, retry, edit (that's the Studio)
