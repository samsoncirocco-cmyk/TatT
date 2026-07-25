# Forge bot: conversation voice and the Flux/Krea routing table

The design bot is a tattoo consultant, not a form. Two things make it read that way, and both are specified here because they were previously spread across ADR-0019–0022 and the model catalog: how the bot talks, and which model serves the render. This ADR is the single normative source for the conversation rules, the routing table, the aspect-ratio map, the IP/character rule, and the Flux/Krea provider gotchas.

## Part 1 — How the bot talks

The target feeling is texting a knowledgeable friend who has taste and asks smart questions, not a customer service script.

Four rules, in force every turn:

- **No validation prefixes.** Never "Great choice!", "Awesome!", "Perfect!", or "the forearm is a great spot!" before moving on. React to the *content* of what they said and chase the thread. The one exception (ADR-0021) stands: when someone shares something heavy — a loss, an illness, grief — acknowledge it genuinely and briefly before the question.
- **One question at a time.** Never bundle two questions into one message.
- **Never confirm the answer was acceptable.** Use it and move forward.
- **Paraphrase meaning back; never stitch verbatim answers into sentences.** "a piece about your love of my hero academia" becomes "something that captures the MHA world and what it means to you."

### Turn cadence

The 6 / 12 / 20 cadence from ADR-0021 is unchanged; this is what happens inside it.

- **Turn 1 (bot opens).** Placement and meaning in one message: "Hey, two things to start: where on your body are you thinking, and what do you want this piece to mean?" This is the one place two asks share a message — they are the two hard constraints, and the opener is deterministic, not a model turn.
- **Turns 2–4.** Chase the thread. Vague placement gets deeper (inner or outer? contained piece or sleeve energy?). Vague meaning gets specific (which character? what moment?).
- **Turns 5–6.** Resolve style — never generically. Offer a contrast built from what they have already said: "Given the MHA energy, are you thinking clean fine-line or something with more weight and blackwork?"
- **Turn 6 target, turn 12 hard cap.** Propose: play back what was heard, offer a "Show me" button. "Here's what I'm hearing, Deku on the inner forearm, fine-line blackwork, capturing that raw determination moment. Want to see it?"
- **Turn 20.** Warm handoff to an artist.

### Generic filler, and what replaces it

- forearm → "inner or outer? and are you thinking a contained piece or something with more room to breathe?"
- MHA → "which character pulls you most, Deku's raw determination hits different than Todoroki's whole conflict-with-power thing"
- blackwork → "more clean geometric lines or do you want texture and stippling in there?"

The word "limit" is never said. The framing is "I want to make sure I get this right before we generate."

## Part 2 — Model routing

Three models, routed by style at proposal time. **`stability-ai/sdxl` and every SDXL-era variant are dropped entirely.**

1. **`black-forest-labs/flux-dev`** — the default lane. Best linework, best prompt adherence, handles blackwork and anime detail well. Serves blackwork, geometric, traditional, fine-line, and any IP/character session.
2. **`krea/krea-2-medium`** — the anime/illustrative lane, when style tags resolve to anime, manga, illustrative, or painterly. Verify slug and input schema before wiring (`GET /v1/models/krea/krea-2-medium`; check `openapi_schema` for `aspect_ratio` vs `width`/`height`).
3. **`black-forest-labs/flux-schnell`** — speed fallback, for refinement passes and retries when Flux Dev is throttled.

| Style resolves to | Model |
|---|---|
| blackwork / geometric / default | flux-dev |
| fine-line / traditional / flash | flux-dev |
| anime / manga / illustrative / painterly | krea2 (flux-dev fallback if krea 422s) |
| refinement pass / retry | flux-schnell |
| realism / portrait | Vertex Imagen 3 (unchanged) |

### Aspect ratio, composition, and presentation

Aspect ratio is passed directly to the model. Placement arrives as a free-text phrase ("left forearm", "inner bicep"), so the map matches on the phrase, not on string equality.

| Placement | Ratio |
|---|---|
| forearm | 9:16 |
| upper arm / bicep | 9:16 |
| chest | 3:4 |
| back | 3:4 |
| calf / shin | 9:16 |
| wrist | 1:1 |
| *default* | 9:16 |

The default is portrait, not square: tattoos sit on limbs far more often than not, and a square canvas wastes the composition.

**Presentation is pinned by the color/monochrome axis, not chosen per render.** Color sessions render **tattoo-on-skin** — the design shown as applied ink on a real limb. Monochrome sessions render **flash art on white** — the design as a standalone sheet, no body.

This is not an aesthetic preference; it is what each mode has to prove. Color's risk is how the palette reads against skin tone, which a white sheet cannot show. Monochrome's risk is line quality and contrast, which skin rendering muddies with shadow and curvature. Rendering each in its own mode also keeps a reveal's four designs visually comparable to each other — a set that mixes on-skin and on-white reads as four different products, and the user's pick starts tracking presentation instead of design.

The pin is derived from the resolved axis pole; it is never a separate user choice and never varies within a reveal.

### The color/monochrome axis

The axis carried in code as `color-blackwork` (`src/services/intake/types.ts`) has poles **color** and **monochrome**. "Monochrome" — not "blackwork" — is the pole name, because `blackwork` is *also* a closed style tag, and a pole sharing a name with a tag makes an already-resolved axis look ambiguous. Monochrome is the wider pole: it covers `blackwork` and `black-and-grey` alike, both of which resolve the axis on their own.

`color` is a closed style tag in the ontology (`data/style-ontology.json`, alias `colour`), sitting alongside `blackwork` and `black-and-grey`. Adding it was a human-approved ontology change under ADR-0011; it is normative here because the prompt builder branches on it.

The axis resolves from style tags before it is ever asked about. A session tagged `blackwork`, `black-and-grey`, or `color` has already answered it, and offering it as a variation would spend one of the reveal's four slots re-asking a settled question.

### Prompt builder: color is front-loaded, never appended

Flux weights early tokens heavily, so the color decision goes at the **front** of the prompt, not into a trailing clause. Appending "black ink only" after sixty tokens of subject description loses to the subject; leading with it does not.

Conditional, by resolved pole:

- **Monochrome** (`blackwork`, `black-and-grey`, or the monochrome pole): the prompt opens with the monochrome instruction — "black ink only, no color, no background fill" — before style, subject, or placement.
- **Color** (`color` tag, or `anime`/`new-school` resolving to color): the prompt opens with the vibrant-color instruction — a saturated palette with a deliberate color story — before the rest.

The two branches are mutually exclusive and exactly one always fires; there is no neutral third path that leaves color unstated. An unstated palette is not neutral in practice — the model picks one, and it picks inconsistently across a reveal's four slots, which is the exact variance the axis exists to control.

This composes with the exclusion-folding rule below rather than replacing it: the front-loaded instruction sets the palette, and any remaining exclusions still fold into the positive prompt at the end.

### Flux takes no negative prompt

Neither Flux nor Krea has a `negative_prompt` input. Exclusions fold into the positive prompt text instead:

- blackwork pole: "black ink only, no color, no background fill"
- fine-line pole: "clean linework, no heavy fill, no bold outlines"

The `negative_prompt` field is never sent to the Flux or Krea lanes. SDXL weight syntax must be stripped before folding into an `Avoid:` clause and normalized to plain language: `(shading, gradients: 1.5)` becomes "avoid shading and gradients". These models read prose; they do not speak the weight dialect, and the parentheses survive into the image as noise.

### IP/character rule

Enforced at intake extraction, not left to the prompt template:

- A detected named character or franchise **locks the literal-abstract axis to "literal"** — a named character means the user wants a recognizable depiction, so that axis is never offered as a variation.
- The `subject` field is filled with a concrete visual phrase: character name, franchise, signature visual detail, specific expression or moment.
- The template uses `subject` **directly**. It never wraps verbatim meaning in `expressing "..."` — quoting the user's own words back into a prompt fights the model for recognizable IP.

Example: `subject = "Son Goku, Dragon Ball Z, spiky hair, determined expression, Super Saiyan energy aura crackling around raised fist"`.

### Provider gotchas

**Krea is single-output.** `krea2` does not accept `num_outputs > 1`. When `numImages > 1` on the krea2 lane, fan out N parallel predictions and merge the results. Silently returning one image where the UI expects four is not an acceptable degradation.

**Deduplicate the resolved fallback chain.** Old model IDs alias to new ones, so two distinct config keys can resolve to the same catalog model. Deduplicate *after* aliasing: if the primary and the first fallback resolve to the same model, skip to the next distinct one. A failed primary must never retry the identical model.

## Part 3 — Confidence logging

Unchanged from ADR-0022; restated here so the whole picture lives in one place. Every turn writes a TurnLog: turn number, readiness score, missing fields, which rule fired (bot judgment / turn-12 force / turn-20 handoff / none), and the model that served the turn.

The readiness score is 0–1 and **computed in code, never taken from model output**: placement specific +0.20, placement named +0.10; meaning substantive +0.20, meaning non-trivial +0.10; style tags present +0.20; axes resolved +0.20. The proposal threshold is 0.70.

Logs persist on the session record from turn 1. They are internal only — a whitelist stripper at the service boundary keeps TurnLogs from reaching the browser.

## Consequences

Part 1 is a voice spec, which means it is enforced by the persona prompt and reviewed by reading transcripts — not by unit tests. The cadence caps around it stay deterministic code (ADR-0021), so the untestable part is bounded to phrasing.

Part 2's aspect-ratio map changes generated output for every session whose placement was previously unmatched: those rendered 1:1 and will now render 9:16. That is the intended correction, but it invalidates visual comparisons against anything generated before it lands.

The IP rule is enforced twice on purpose — once in extraction, once when completing the record — because the conversational lane and the questionnaire lane reach the reveal by different paths and both must lock the axis.

The presentation pin makes the color/monochrome axis load-bearing beyond the prompt: it now decides how the render is framed, so a session whose axis resolves late or wrong produces a visually inconsistent reveal, not just an off-palette one. That is the intended coupling — presentation and palette are one decision — but it means the axis must be resolved before render, never during.

Naming the pole "monochrome" while the axis id stays `color-blackwork` is a deliberate half-measure. Renaming the id would touch the `VariationAxis` type, the pole tables, both extraction prompts, and every stored session record, and the rename buys clarity rather than behavior. The pole names are what reach the model and the user; the id is internal. If the record migration happens for another reason, fold the rename in then.
