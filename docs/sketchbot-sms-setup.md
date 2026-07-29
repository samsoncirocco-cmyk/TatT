# SketchBot SMS — setup and operations (TAT-49)

The design-by-text channel: texting the TatT number runs the same
conversation engine as the web chat (`/design`), and saying yes to the
proposal delivers the four cuts as MMS plus a share link back into the web
experience. The whole channel ships **dark** behind `SKETCHBOT_SMS_ENABLED`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SKETCHBOT_SMS_ENABLED` | `false` | Master flag. Anything but `true` makes `/api/webhooks/twilio` answer 404 — the channel does not exist. |
| `TWILIO_ACCOUNT_SID` | — | Twilio account SID (`AC…`). Server-side only. |
| `TWILIO_AUTH_TOKEN` | — | Signs/verifies `X-Twilio-Signature`. Server-side only. Unset/placeholder ⇒ webhook fails closed with 503. |
| `TWILIO_PHONE_NUMBER` | — | The purchased number, E.164 (`+1…`). Outbound sender. |
| `SKETCHBOT_SMS_REVEALS_PER_DAY` | `2` | Per-phone reveal cap per UTC day. Reserved atomically **before** generation. |
| `SKETCHBOT_SMS_FREE_REVEALS` | `2` | Lifetime reveals before an unlinked number is invited to create an account (the link gate). |
| `SKETCHBOT_SMS_MSGS_PER_HOUR` | `30` | Per-phone inbound message rate limit (silent drop beyond it). |
| `SKETCHBOT_SMS_ALLOW_UNSIGNED` | unset | **Non-production only** signature bypass for local webhook testing — same discipline as `STRIPE_WEBHOOK_ALLOW_PLACEHOLDER`. |

Shared knobs that also govern this channel: `BUDGET_MAX_SPEND_CENTS` (SMS
reveals spend from the same global pool as `/api/v1/generate`),
`VERTEX_IMAGEN_COST_CENTS`, `CONVERSATION_TURNS_PER_CENT`,
`NEXT_PUBLIC_APP_URL` (links texted to users), and the Upstash vars (the
per-phone rate limit is only cross-instance with Redis configured).

## Spend guardrails (why an unknown number cannot drain the budget)

1. **Atomic daily reveal cap** — `sms_profiles.tryConsumeReveal` reserves a
   slot in a Firestore transaction before any render fires; a failed
   generation refunds it. Default 2/day.
2. **Account-link gate** — an unlinked phone gets at most
   `SKETCHBOT_SMS_FREE_REVEALS` reveals *ever*; after that the bot texts the
   signup invitation instead of rendering.
3. **Global budget** — `checkBudget()` before every reveal,
   `recordImageSpend()` after, same pool and constants as the web reveal.
   Exhausted ⇒ an honest "we're at capacity today" text, never silence.
4. **Message rate limit** — per-phone, before the engine ever runs; each
   conversation turn is also metered into the budget
   (`recordConversationTurnSpend`, same as the web converse route).

Worst case per unknown number per day (defaults):
`min(2 daily, 2 lifetime) reveals × 4 images × VERTEX_IMAGEN_COST_CENTS(4¢) = 32¢`,
inside the global `BUDGET_MAX_SPEND_CENTS` cap like all other spend.

## Samson's one-time Twilio console setup (~1 hour)

1. **Create the account** at twilio.com (or use the existing one). Copy the
   Account SID and Auth Token from the console dashboard.
2. **Buy a number**: Phone Numbers → Buy a Number → check *SMS* and *MMS*
   capabilities (US local number, ~$1.15/mo).
3. **A2P 10DLC registration** (required for US traffic): Messaging →
   Regulatory Compliance → register the TatT **brand**, then a **campaign**
   (use case: "Conversational messaging"; sample messages: the design
   conversation + the reveal). Attach the purchased number to the campaign.
   This is the ~1-hour step; carriers may take a day to approve.
4. **Keep Advanced Opt-Out ON** (Messaging Service → Opt-Out Management —
   on by default): Twilio auto-answers STOP/HELP/START and suppresses sends
   to opted-out numbers. The webhook additionally records opt-out state and
   never replies to compliance traffic.
5. **Point the webhook**: Phone Numbers → your number → Messaging →
   "A message comes in" → Webhook, `POST` to
   `https://tatttester.com/api/webhooks/twilio`.
   The URL in the console must match this **exactly** (scheme, host, path —
   no trailing slash): the signature is computed over it.
6. **Env vars**: drop `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_PHONE_NUMBER` into `.env.local` and the Vercel project (same
   discipline as the Instagram keys). Leave `SKETCHBOT_SMS_ENABLED` unset.
7. **Turn on**: set `SKETCHBOT_SMS_ENABLED=true` in Vercel and redeploy.
   Turn-off is the same flag — the webhook 404s again immediately.

## Delivery design notes

- **Sequential MMS, not a collage**: Twilio caps a message's media at 5MB
  total and carriers transcode aggressively; four ~1–2MB renders in one
  message would routinely fail or arrive mangled. Each cut goes as its own
  captioned MMS ("Cut 1 of 4"), followed by a closing text with the share
  link. A collage would add image compositing only to lose per-cut zoom.
- **Media URLs**: variation images are hosted URLs (Replicate) or GCS
  signed URLs — Twilio fetches them once at send time and re-hosts on its
  CDN, so time-limited signatures are fine.
- **The web bridge**: the reveal mints a durable share
  (`/share/<id>`, same store as the web share flow) — AR try-on and booking
  continue there.
- **Timing**: the webhook answers conversational turns synchronously
  (TwiML); reveals are acked instantly and generated in `after()` (renders
  take minutes; Twilio gives webhooks ~15s).
