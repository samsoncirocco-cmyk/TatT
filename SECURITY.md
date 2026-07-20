# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please email **samson.cirocco@gmail.com** with
steps to reproduce and the potential impact. **Do not open a public GitHub issue
for security problems.**

We aim to acknowledge reports within 48 hours and will keep you updated on the fix.

## Handling secrets

- Never commit populated `.env*` files. Only `.env.example` (keys with empty
  values) is tracked in git.
- If a credential is ever exposed, **rotate it at the provider first** — removing
  the file or rewriting git history does not invalidate a key that still works.
- CI runs `scripts/security/scan-secrets.mjs` on every push and pull request to
  catch accidental secret commits.

## Supported surface

Production runs on Vercel. API routes require authentication (Firebase ID tokens
for user requests; Google OIDC for Cloud Tasks). See `docs/SECURITY_MODEL.md` for
the full model.
