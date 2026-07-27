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
The multi-layer power editor at `/generate` (canvas, placement, transforms).
A power tool behind explicit doors — never part of the main journey; the
optional editing room reachable from any picked design (ADR-0017, ADR-0028).
Invest or delete based on real usage.
_Avoid_: Forge (its old name), editor page

**Artist console**:
The artist-side home TatT launches with: bookings list, availability, payout
status (ADR-0031). Does not exist yet — `/dashboard` currently redirects to
the consumer design library. The free rung the paid artist plan later upsells
from.
_Avoid_: dashboard (currently a consumer redirect), CRM (that's the paid rung)

### Design bot (ADR-0009–0016)

**Confidence layer**:
What the consumer flow sells: enough certainty to book an artist, not a
finished design. Bot, reveal, and canvas exist to move a first-timer from
"vague idea" to "I know what I want and who should do it."
_Avoid_: design tool, AI art generator

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
