# Google Calendar connection — what Samson must authorise

Everything in `src/lib/artist-calendar*.ts` is built and tested against mocks.
No agent has run an OAuth flow, held a Google credential, or written to a real
calendar. Until the steps below are done, **every artist resolves to the request
model** — which is the correct, honest default and breaks nothing.

The flow is per-artist. Each artist connects their own Google account through
the UI at `/artist/{artistId}/availability`. `samson.cirocco@gmail.com` becomes
the first **test user**, not a credential the platform holds.

---

## 1. Create the OAuth client (10 minutes)

In the Google Cloud console, on the `tatt-pro` project:

1. **APIs & Services → Library →** enable **Google Calendar API**.
2. **APIs & Services → OAuth consent screen:**
   - User type: **External** (artists are not in a Workspace org).
   - App name, support email, developer contact, and TatT's privacy policy and
     terms URLs. These are required before verification and are checked.
   - Publishing status starts as **Testing**. See §4.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - Type: **Web application**
   - Authorised redirect URI (exactly, including scheme and path):
     - production: `https://<prod-domain>/api/v1/artist/calendar/callback`
     - preview/dev: `http://localhost:3000/api/v1/artist/calendar/callback`

   The code derives this from `NEXT_PUBLIC_APP_URL`, so it must match what is
   registered or Google refuses the exchange with `redirect_uri_mismatch`.

## 2. Scopes to declare

Declare only these. Adding more later means re-verification.

| Scope | Purpose | When requested |
|---|---|---|
| `https://www.googleapis.com/auth/calendar.freebusy` | Read busy start/end times. **No** titles, guests, locations, descriptions or organisers. | Always |
| `https://www.googleapis.com/auth/calendar.app.created` | Create a secondary "TatT Bookings" calendar in the artist's account and write only to it. Cannot read or change their existing calendars. | Only if the artist opts into write-back |

**Why not the usual ones.** `calendar.readonly` returns every event body on
every calendar the artist can see — far more than "when are you busy", and a
much harder thing to ask a working artist for. `calendar.events` is read+write
across every calendar they own. `calendar.freebusy` + `calendar.app.created` is
the narrowest pair that does the job.

## 3. Environment variables

```bash
GOOGLE_OAUTH_CLIENT_ID=<client id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<client secret>          # server only
NEXT_PUBLIC_APP_URL=https://<prod-domain>           # must match the redirect URI
CALENDAR_TOKEN_ENCRYPTION_KEY=<base64 of 32 random bytes>
GOOGLE_CALENDAR_WRITE_ENABLED=false                 # leave false until deliberate
```

Generate the encryption key with:

```bash
openssl rand -base64 32
```

**This key is a credential.** It decrypts every artist's Google refresh token.
Put it in Secret Manager / Vercel env alongside `STRIPE_SECRET_KEY`, never in
a repo file. Losing it does not lose data — every artist simply has to
reconnect, because their sealed tokens become unreadable. Leaking it is
equivalent to leaking every connected artist's calendar access.

Without `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` the connect button reports
"not switched on for this environment" and every artist stays on requests.

## 4. Verification — start this early

This is a **launch-timeline dependency, not a code problem**, and it is the kind
of thing discovered a week before launch.

While the consent screen is in **Testing**, only accounts added under
**Audience → Test users** can complete the flow, capped at **100 users**. That
is plenty for building — add `samson.cirocco@gmail.com` and the first pilot
artists and everything works today.

To let *arbitrary* artists connect, the app must be **published**, and
publishing an External app that requests scopes Google classifies as *sensitive*
requires **verification**: a demo video of the consent flow, a written scope
justification, verified domain ownership, and a homepage/privacy-policy review.
Turnaround has historically run from days to several weeks.

**Confirm the classification before assuming which lane applies.** Google's
public scope tables do not print the sensitivity category; the authoritative
answer is the **OAuth consent screen** page in the Cloud console, which puts a
"sensitive" badge next to each declared scope. Check that as soon as the client
exists — the scopes here were chosen partly to be the narrowest available, and
if `calendar.freebusy` is non-sensitive the whole verification lane may be
avoidable. **Do not plan a launch date on the assumption that it is.**

Practical order:

1. Create the client, add test users, build and pilot. **No verification
   needed.**
2. Look at the consent screen page and note which of the two scopes carry a
   sensitive badge.
3. If either does, start verification **before** you need public sign-up, not
   when the 101st artist asks why the button fails.

## 5. What is deliberately NOT enabled

- **Calendar writes.** `GOOGLE_CALENDAR_WRITE_ENABLED` defaults to false and is
  checked before any network call in `writeBookingEvent`. Confirmed bookings
  build a complete event payload that is never sent. Turn it on only after
  watching the payload against a throwaway calendar.
- **Anything reading event contents.** No code path requests, stores or logs
  event titles, guests or descriptions. The free/busy response does not contain
  them.

## 6. Verifying it works, end to end

1. Set the env vars, restart, sign in as an artist who has claimed a profile.
2. Go to `/artist/{artistId}/availability`, publish some weekly hours, save.
3. Press **Connect (read busy times)** → Google consent → back to the editor
   with `?calendar=connected`.
4. Open `/book?artistId={artistId}` in another browser. Step 01 should show
   concrete times, and the label should read **Live calendar**.
5. Put a busy event on the connected calendar covering one offered slot, reload
   `/book`, and confirm that slot is gone.
6. Press **Disconnect**, reload `/book`, and confirm it says **Availability on
   request** again with no slots.

Step 6 is the one that matters most. If it ever shows stale slots after a
disconnect, stop and fix that before anything else — showing a slot you cannot
honour is the failure this whole design exists to prevent.
