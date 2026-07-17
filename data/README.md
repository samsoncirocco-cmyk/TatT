# National Artist Dataset

`national-artists-2026-07-15.json` — 6,434 real tattoo artists + 3,594 shops
across 197 US cities, collected 2026-07-15 by `execution/scrape_artists.py`
orchestrated by `execution/scrape_scheduler.py` (Google Places API discovery +
polite public-website crawl; robots.txt honored; no Instagram scraping).

- `artists[]` is in the exact shape `scripts/import-to-neo4j.js` consumes
  (plus `shops[]` with place_id/rating/review data).
- Honest fields: `hourlyRate`/`yearsExperience` are null (unobservable);
  `rating`/`reviewCount` are the *shop's* Google values (tag `shop-rating`);
  every artist carries `sourcePages` provenance.
- 2,524 artists have portfolio image URLs; 1,540 have inferred style tags.

`ink-graph.html` — self-contained interactive visualization of this dataset
(open directly in a browser; no dependencies).

## Regenerating / extending

The scrape workspace lives on the collection machine at `~/tatt-scraper/`
(clone + venv + `data/` state). A launchd job (`com.tatt.scraper`, plist in
`~/Library/LaunchAgents/`) ticks `scrape_scheduler.py tick` every 5 minutes;
it is currently unloaded because the 10k artists+shops target was reached.
To extend: raise `target` in the workspace `state.json`, delete its `DONE`
file, append cities to `queue.json`, and `launchctl load` the plist.
