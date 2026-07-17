# TatT Security Model

## Authentication

TatT browser clients authenticate with Firebase. Protected Next.js API routes
accept a Firebase ID token in the `Authorization: Bearer <token>` header and
verify its signature with Firebase Admin.

The request proxy performs CORS filtering only. It does not implement a second
cookie authentication system; every protected API route owns an explicit,
testable authentication check.

Do not use a shared browser token such as `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN`.
Every `NEXT_PUBLIC_*` value is included in browser assets and must be treated as
public configuration.

## Secret storage

- Local secrets belong in ignored `.env.local` or `.env.master` files.
- Vercel production and preview secrets belong in Vercel environment variables.
- Google Cloud workloads should use attached service accounts or Workload
  Identity. Long-lived service-account JSON keys are a compatibility fallback.
- Never include credentials in documentation, screenshots, fixtures, or Git.

## Required checks

Run `npm run security:secrets` before committing. CI runs the same check on each
pull request and push to `main`. Findings report only file, line, and category;
the scanner never prints the suspected value.

Run `npm audit` during dependency updates. High and critical findings block a
release; moderate transitive findings require review and documentation.

As of 2026-07-17, the dependency tree has no high or critical advisories. Ten
moderate advisories remain in the Google/Firebase `uuid` dependency chain; npm's
suggested automatic fix is a breaking downgrade and is intentionally deferred.

## Incident response

If a secret is committed, rotate or revoke it first, remove it from the current
tree, and verify the replacement. Rewriting Git history is a separate,
coordinated operation because it invalidates existing clones and branches.
