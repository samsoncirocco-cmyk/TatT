# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-17 (house-brain session)_

## Now (in priority order)

1. **Review PR #40** — wires national dataset into `/artists` and `/matches`.
   Risk to check (lesson from PR #34): queries must serve BOTH graph schemas —
   real artists tag directly via `TAGGED_WITH`, have `hourlyRate: null` (never
   exclude on budget), and have no `Tattoo` nodes. Owner: house-brain session.
2. **Enable branch protection on `main`** — require PRs, forbid force/direct
   pushes. Motivated by a near-miss: a stale-clone push right after the
   password history rewrite. Owner: Samson (Settings → Branches) or any agent
   via `gh api`.
3. **Reconcile `codex/tatt-security-hardening` with main** — 5 conflicting
   files (debug route, Stripe webhook, Cloud Tasks auth, council rate-limit,
   TATT_ENV_REFERENCE.md). Keep main's behavior + branch's hardening intent;
   gates: `npm test` + `npm run build`. Unblocks draft PR #39.
4. **Final scrape run** — last 99 queued cities in flight on house-brain
   (`~/tatt-scraper`, launchd `com.tatt.scraper`). On DONE: checkpoint
   (auto-cleans names), regen `data/ink-graph.html`
   (`scripts/regen-ink-graph.mjs`), PR + merge. Owner: house-brain session.

## Next

5. **Merge PR #35** (README truth sync) — after #39/#40 land, re-verify
   accuracy, then merge.
6. **Decision needed (Samson): 100 synthetic AZ seed artists in Aura** — keep
   (9-node schema demos) or delete (they pollute real match results)?

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
