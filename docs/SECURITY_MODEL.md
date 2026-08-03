> **⚠️ Not a current entry point.** This file is not listed in
> `docs/status/document-classification.md`'s "Current entry points" and may be
> stale. Last touched 2026-07-17, the same day as a security-hardening
> commit ("Harden TatT authentication and secret handling"), with a follow-up
> security commit (#44: route classification test, 401 sign-in modal, Cloud
> Tasks kill switch) landing after this file was last edited — so it may
> already have diverged. Cross-check auth/security claims against
> `docs/status/features.yaml` and `docs/architecture/current-architecture.md`
> before relying on this document.

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

## Route classification

Every file under `src/app/api/**/route.ts` must be classified in
`src/lib/api-route-security.ts` as `firebase-auth`, `cloud-tasks-oidc`,
`webhook-signature`, or `public` (with a written reason).
`src/lib/api-route-security.test.ts` inventories the filesystem on every test
run: adding a route without a classification, or classifying a route without
calling its enforcement function, fails CI.

## Cloud Tasks enablement

`enqueueGenerationTask` refuses to enqueue unless `CLOUD_TASKS_ENABLED=true`.
Do not set that flag until, against the real GCP project: (1) a genuine Cloud
Tasks request passes `verifyCloudTaskRequest`, and (2) a spoofed request (bad
audience, wrong service account, or forged token) is rejected with 401. Record
the verification date here when it happens.

## Incident response

If a secret is committed, rotate or revoke it first, remove it from the current
tree, and verify the replacement. Rewriting Git history is a separate,
coordinated operation because it invalidates existing clones and branches.
