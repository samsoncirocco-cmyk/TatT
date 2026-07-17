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

## Cloud Tasks authentication

`POST /api/v1/tasks/generate` is invoked by Google Cloud Tasks, not by browser
clients, so it cannot use a Firebase ID token. It is instead protected by
`verifyCloudTaskRequest` (`src/lib/cloud-tasks-auth.ts`), which verifies the
request's OIDC identity token against Google's public keys and checks that the
token's `audience` matches `CLOUD_TASKS_AUDIENCE` (or the derived
`CLOUD_RUN_URL`) and that its `email` matches
`CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT` (or `TASK_SERVICE_ACCOUNT`).

**This fails closed by default.** If any of those environment variables are
unset — which is the case until a real GCP Cloud Tasks queue and invoker
service account are provisioned — the check unconditionally returns `false`
and the endpoint 401s every request, including legitimate ones. There is
deliberately no bypass or demo mode for this path. Before relying on
`/api/v1/tasks/generate` in an environment, verify the full path against a
real Cloud Tasks dispatch (not just the mocked unit tests in
`src/lib/cloud-tasks-auth.test.ts`) — confirm a task enqueued in that GCP
project actually reaches the endpoint with a 200, using the real invoker
service account's OIDC token.

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
