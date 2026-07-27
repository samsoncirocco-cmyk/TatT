# Retired data-acquisition prototypes

The scripts left in this directory are historical crawler experiments. They are
not the supported acquisition or import path and must not be used to label an
artist as verified.

The old prototype and “production” validators were removed by ADR-0032 because
both fabricated portfolio, style, quality, and verification fields with
`Math.random()`. Supplying `GEMINI_API_KEY` did not make the production-named
validator real.

Use the evidence-preserving pipeline instead:

```bash
python execution/scrape_artists.py all --cities "Phoenix,Scottsdale,Tempe"
```

Read `execution/scrape_artists.py` before operating it. Its normalized output is
written to `.tmp/scrape/artists.json` by default. It is discovered candidate
data, not identity, consent, portfolio-quality, or professional verification.
Review and promote that artifact deliberately before following
`directives/import-artists.md`; the canonical importer reads
`src/data/artists.json`, applies the takedown tombstone gate, and requires an
operator-controlled execution.
