# AGENTS.md

This file exists for AI coding tools that look for `AGENTS.md` by convention
(Cursor, Codex, and others). It intentionally holds no separate instructions —
read these, in order, instead:

1. **[CLAUDE.md](CLAUDE.md)** — engineering standards, tech stack, service
   map, environment variables, and the worktree rule for this repo. Written
   for Claude Code but applies to any agent working here.
2. **[docs/README.md](docs/README.md)** — the documentation authority order:
   which documents can establish current truth vs. which are historical
   evidence only. Read this before trusting any single doc, including this
   one.
3. **[execution/README.md](execution/README.md)** — maps each `directives/*.md`
   workflow to the API routes, services, and scripts that implement it.

If a tool-specific instruction file (`.cursor/`, `.codex/`) conflicts with
`CLAUDE.md`, treat `CLAUDE.md` as authoritative for this repo.
