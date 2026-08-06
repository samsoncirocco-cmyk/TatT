---
status: accepted
---

# Every render builds from the whole state object; a critique updates a field

Session captured 2026-08-05 (`tatttester.com/design`, "Think it. Ink it."
export). The customer asked for "a kingdom hearts sleeve with roxas and sora
fight link from zelda and boswer from mario" — four named characters and a
combat premise. The proposal came back as "a color and anime and illustrative
piece on your sleeve — **roxas and sora**." Two characters, silently dropped.
The customer had to say "you dropped some of the characters i mentioned" to get
them back.

It kept going. Composition was asked about twice — "should we show them as a
group, or are you picturing them in specific combat poses?" — before the roster
was ever fixed. The reveal produced four cuts labelled *the run*, *the clash*,
*the totem*, *the procession*. The customer said "the totem is the one i like
most can i get it as a 9:11 image this time with the unreal engine changes i
mentioned", and the system replied "re-cut **cut one** with that" — cut one is
*the run*, which was their earlier pick. And "i was thinking more like an unreal
engine 5 look" — a change to the whole piece — drew "which one am i fixing?"

Three different failures with one root cause: nothing holds the design's state,
so every turn is interpreted against the last prompt instead of against the
brief.

## Decision

**An Idea carries an explicit state object, and every render is built from the
whole object.** A critique updates one field and triggers a regeneration from
the complete state — it never appends to the previous prompt.

The fields, as the failing session would have needed them:

```
roster       = [roxas, sora, link, bowser]
composition  = totem
aspect       = 9:11
medium       = tattoo sleeve
palette      = full color
visual_target= realistic, UE5-inspired 3D
action       = mid-combat
exclusions   = [flat anime, missing characters, duplicates]
```

Consequences that follow directly:

- **The roster is non-negotiable once given.** Named characters are a set that
  must survive every subsequent turn. Dropping one is a defect, not a
  paraphrase, and no composition question may be asked while the roster is
  still unconfirmed.
- **A chosen composition becomes state.** "Totem" is not a passing comment about
  one image; it is the composition field, and it stays attached to every
  re-cut that follows.
- **Style words get translated, not passed through.** "Unreal engine 5" is not
  an adjective to append. It resolves to concrete controls — physically based
  materials, cinematic lighting, realistic 3D anatomy, volumetric effects,
  detailed surfaces — and to exclusions: no flat cel-shaded outlines. An
  untranslated style word is a field the system failed to fill, and it should
  ask rather than paste.
- **Cut names are part of the resolver's vocabulary.** The UI showed *the
  totem*; the customer said *the totem*; the server resolved to the pick,
  because `resolveCritiqueTarget` understands ordinals and axis pole words and
  nothing else. Any label shown to a customer must be a label the resolver
  accepts.

## Rejected

- **Appending the critique to the previous prompt.** What
  `adjustPromptForCritique` does today: `${target.prompt} Requested change:
  "${words}".` Its comment states the intent — "a critique adds, it does not
  replace" — which is exactly the flaw. The prompt only grows, contradictions
  accumulate at the tail, and `structuredMode` documents that Flux weights the
  front of a prompt far more heavily than the end. So the earliest wording wins
  and every later correction is structurally disadvantaged. That is why "unreal
  engine 5" never landed no matter how many times it was asked for.
- **More re-cuts as the remedy.** The session had 25 in its allowance and burned
  through several with the counter announced each time ("24 more re-cuts before
  i hand you over"). Re-cuts cannot fix a missing state object; they re-roll the
  same broken derivation and spend real money doing it.
- **Asking the customer to restate the brief.** Puts the system's memory failure
  on the person paying for it.

## Consequences

`adjustPromptForCritique` is replaced rather than adjusted, and the prompt
becomes a pure function of the state object. That makes a re-cut reproducible:
the same state yields the same prompt, and a diff between two states explains
exactly what changed.

This is the ADR-0055 Idea made concrete. The Idea holds the state; the router
(ADR-0056) decides which field a message is trying to change; the faceted
vocabulary (ADR-0058) is what the fields are named in. Roster is the subject
facet, totem is composition, "hard dark lines" is linework, "not a lot of
detail" is a detail constraint.

Validation is now possible before spending a render: a state object naming four
characters and a prompt mentioning two is a detectable contradiction, and the
existing multi-character routing (3+ characters to the Gemini lane, issue #293)
depends on a roster count nothing currently maintains.
