# Directive: Action an Artist Reinstatement Request

**ID:** DIR-020
**Owner:** Ops / Platform Team
**Last Updated:** 2026-07-26
**Last Tested:** Mechanism tested against fixtures. **Never yet run against live data.**
**Risk Level:** High — hands an account ownership of a profile that can receive client deposits
**Estimated Duration:** 10 minutes, plus however long verification takes

## Purpose

A takedown (DIR-019) is permanent by design: a tombstone keyed on the Instagram
handle blocks every ingest path, forever. This directive is how an artist who was
removed comes back **by their own choice**.

The decisions behind it are in **`docs/adr/0026-reinstatement-self-signup.md`**.
Read that first; this is only the runbook. The two things to hold in your head:

1. **The tombstone is never lifted.** Our scrapers stay permanently blocked from
   re-adding this handle, before and after reinstatement. You are not opening the
   wall, you are opening a different door.
2. **Nothing is restored.** The photographs and the profile details were
   destroyed. The artist gets an empty profile bound to their account. If someone
   is expecting their old portfolio back, correct that expectation early.

## When to use

A signed-in user has submitted `POST /api/v1/artists/reinstate`, which emails
`OPS_NOTIFY_EMAIL` with an `RI-XXXXXXXX` reference and a `TATT-XXXXXXXX`
verification code.

**Do not use this** for an artist who was never removed — they sign up normally.
The script will refuse anyway.

## Prerequisites

- [ ] `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in `.env.local`
- [ ] **You have personally seen the verification code on the Instagram account**
      (Step 2 — this is the entire identity check; do not skip it)

## Procedure

### Step 1 — Dry run

Read-only. Changes nothing. Tells you what the graph actually knows, including
whether a tombstone exists at all — the API deliberately does not reveal that to
the requester, so this is the first honest answer anyone gets.

```bash
node scripts/execute-reinstatement.mjs --instagram <handle>
```

Read the BLOCKERS section. Every blocker is a refusal, not a suggestion.

### Step 2 — Verify handle control

The dry run prints:

```
>>> CHECK https://instagram.com/<handle> FOR THIS CODE:
>>>     TATT-XXXXXXXX
```

Open that profile and look for the code — bio, a post, or a story. **No code in
this system can read Instagram.** `--handle-verified` is you asserting you looked.
If you pass it without looking, the entire mechanism is worth nothing.

What this proves: whoever controls that Instagram account made this request.
What it does not prove: that they are the original artist, if the account has
been taken over. See ADR 0026 "Attack surface".

If you cannot see the code, **stop**. Reply to the requester (the ops email has
`replyTo` set to their address) and ask them to publish it.

### Step 3 — Stop and escalate if the profile is already claimed

If the dry run says the artist is *claimed by a DIFFERENT account*, do not
proceed and do not try to work out who is right from the command line. That is
issue #192 — the claim flow performs no identity check, so an existing binding
proves nothing — on a profile that may hold a connected Stripe account.

Resolve out of band, with whoever owns this decision.

### Step 4 — Execute

Only after Steps 1–3.

```bash
node scripts/execute-reinstatement.mjs \
  --instagram <handle> \
  --handle-verified \
  --execute --confirm <handle>
```

`--confirm` must exactly equal `--instagram`. A stray `--execute` on its own does
nothing.

Expected output:

```
  REINSTATED.
    Tombstone marked (NOT removed): true
    Node unsuppressed:              true
    Bound to uid:                   <firebase uid>
    Scrapers remain permanently blocked from re-adding this handle.
    The artist has an EMPTY profile — nothing deleted was restored.
```

If it reports `EXECUTED WITH FAILURES`, the reinstatement is **incomplete**.
Fix the cause and re-run. Do not report it as done.

### Step 5 — Tell the artist what they actually have

Reply to the `RI-` reference. Say plainly:

- Their profile is live and belongs to their account.
- It is **empty**. Their previous photographs and details were permanently
  deleted when they were removed and cannot be recovered.
- They fill it in themselves from here.
- Our automated collection stays blocked for their handle permanently, so nothing
  will overwrite what they write.

## Notes

- **There is no admin path that skips the artist's request.** If you want to
  reinstate someone who has not asked, you cannot, and that is the feature
  working. Ask them to submit a request.
- **A second reinstatement of the same handle is blocked.** An artist who has
  lost access to their account is an account-recovery problem, not a
  reinstatement.
- **Codes expire after 7 days.** An expired code means asking for a fresh
  request, not waving it through.
- The tombstone keeps a permanent record (`reinstatedAt`, `reinstatedByUid`,
  `reinstatementRequestId`), so a remove-then-relist pattern is visible.

## Related

- `docs/adr/0026-reinstatement-self-signup.md` — the decisions and the honest
  attack surface
- `docs/adr/0025-artist-takedown-semantics.md` — what removal did in the first place
- `directives/artist-takedown.md` (DIR-019) — the counterpart flow
- issue #192 — the unverified claim flow, which Step 3 exists to catch
