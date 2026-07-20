# Contributing to TatT

Thanks for helping improve TatT! This guide covers local setup and the
expectations for changes.

## Local setup

```bash
nvm use                       # Node 24 (see .nvmrc)
npm ci                        # install exact dependencies
cp .env.example .env.local    # fill in your own keys — never commit this file
npm run dev                   # http://localhost:3000
```

Environment variables are documented in `.env.example` and `CLAUDE.md`. Real
secrets live only in your local, gitignored `.env.local`.

## Before opening a pull request

Run the same gates CI runs:

```bash
npm run lint
npm test
npm run build
```

All three should pass. If you touched a user-facing flow, exercise it manually too.

## Branching and commits

- Branch off `main`. Use a descriptive prefix: `feat/…`, `fix/…`, `data/…`,
  `docs/…`, or `chore/…`.
- Write [Conventional Commits](https://www.conventionalcommits.org):
  `type(scope): short summary` — e.g. `fix(auth): require Firebase token on /v1/generate`.
- Keep commits atomic: one logical change each, and every commit should build and
  pass tests.
- **Never** commit credentials or populated `.env*` files, and never push directly
  to `main` — always open a pull request.

## Pull requests

- Fill in the PR template checklist.
- Keep the diff focused; avoid unrelated formatting churn.
- Link the issue the PR closes, if any.

## Reporting bugs and requesting features

Use the issue templates (Bug report / Feature request). For security issues, follow
[SECURITY.md](SECURITY.md) instead of opening a public issue.
