# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-17 (house-brain session)_

## Now (in priority order)

1. **PR #40: address review feedback** — reviewed 2026-07-17 (see PR comment,
   the review of record): BLOCKER ~11 MB JSON in client bundle via
   `matches/page.tsx`; rebuild dataset from canonical clean file after item 4
   lands (drop the duplicate `isNonPerson()` cleaner); fix slug collisions
   (1,037 shadowed) + unstable ids. Owner: PR author session.
2. **Enable branch protection on `main`** — require PRs, forbid force/direct
   pushes. Motivated by a near-miss: a stale-clone push right after the
   password history rewrite. Owner: Samson (Settings → Branches) or any agent
   via `gh api`.
3. ~~**Reconcile `codex/tatt-security-hardening` with main**~~ — **DONE
   2026-07-17**: 5 conflicts reconciled (main behavior + hardening intent);
   `npm test` + `npm run build` green. PR opened; unblocks draft PR #39.
4. ~~Final scrape run~~ — **DONE 2026-07-17** (PR #42 merged): 569 cities,
   0 failures, queue exhausted. Final dataset: **10,427 cleaned artists +
   11,017 shops** (audit: data/cleanup-report.json). Viz regenerated. Aura
   synced. Scraper/checkpoint launchd jobs retired. PR #40's rebuild
   (item 1) can now proceed against this final data.

## Next

5. **Merge PR #35** (README truth sync) — after #39/#40 land, re-verify
   accuracy, then merge.
6. ~~100 synthetic AZ seed artists in Aura~~ — **DONE 2026-07-17**: Samson chose
   delete. Seed artists (float ids), their Tattoo/Instagram/State/Website nodes,
   null-placeId shops, and orphaned tags/cities removed. Live graph is now 100%
   real scraped data. Re-seeding (if ever needed): `scripts/import-to-neo4j.js`.

## Backlog

- **Artist enrichment sweep** — only ~1.5k of 8,949 real artists have style
  tags; enrich styles/portfolio/bio from each artist's `sourcePages`.
  Large fan-out job; good multi-agent/ultracode candidate.
- Ask GitHub Support to purge the orphaned pre-scrub commits (password
  history) if repo visibility ever changes.
- 99+ more cities can be queued in `~/tatt-scraper/data/queue.json` if the
  dataset should grow beyond this run.

## Working agreements (multi-agent hygiene)

- `git fetch && git reset --hard origin/<branch>` before ANY push — history
  was rewritten 2026-07-17 to remove committed credentials.
- Never commit credentials; `.env`/`.env.local` are gitignored on purpose.
- Dataset changes go through `data/` PRs with counts in the commit message.
- The live Aura instance holds real + seed data side by side; never run an
  importer with a wipe flag against it casually.
