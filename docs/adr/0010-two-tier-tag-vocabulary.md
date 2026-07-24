# Two-tier tag vocabulary: closed style tags, freeform emotional context

Extraction emits style tags only from the artist-graph style ontology — matching runs on them, so the vocabulary must be shared and closed — while emotional/meaning context stays freeform prose, because it is read by human artists and flattening "memorial for my dad, warm not somber" into an enum destroys the signal.

## Considered Options

- **Fully closed vocabulary** — rejected: collapses the thing that makes the brief valuable to artists.
- **Free extraction + mapping layer at match time** — rejected: defers the vocabulary problem to a layer where matching breaks silently and you only find out when recommendations are wrong.
