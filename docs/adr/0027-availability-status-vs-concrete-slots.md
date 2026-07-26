# Availability: status-as-a-request vs. concrete bookable slots

## Status

**Proposed — this is a product decision and it belongs to Samson, not to the
implementing agent.** Nothing in this ADR is implemented. PR #112's scheduling
engine remains unwired; no slot picker is connected to the booking wizard.

## Context

Two incompatible models now read the same Firestore document,
`artist_availability/{artistId}`.

**Model A — status as a request (shipped, live).**
`src/lib/booking.ts` and `src/app/book/BookClient.tsx` state the principle
outright: *"Availability is a request, not a reservation: we never show fake
open slots."* The document holds `{ status: "unknown" | "open" | "waitlist" |
"closed", note?, updatedAt? }`. `normalizeAvailability` collapses anything
malformed or missing to `"unknown"`, which the UI renders as "Availability on
request". The client picks up to three preferred dates
(`normalizeRequestedSlots`, `MAX_REQUESTED_SLOTS = 3`), pays a deposit, and the
artist confirms or counters afterwards. Per `firestore.rules` the document is
ops-written; artists cannot write it.

**Model B — concrete slots (PR #112, unwired).**
`src/lib/scheduling-engine.ts` reads recurring weekly hours plus date overrides
from the same document and generates discrete bookable slots, filtered by
existing bookings, buffers, and minimum booking notice. `:SessionType` nodes
supply duration and buffer configuration per offering.

The two are not variants of one design. Model A promises the client *nothing*
until a human answers. Model B promises that a displayed 2:00 PM Thursday is
real and will still be there at checkout.

## What each implies for the user

| | Model A (status) | Model B (slots) |
|---|---|---|
| Client sees | "Availability on request" + up to 3 date preferences | A calendar of real times |
| Conversion | Lower — an unanswered question at the moment of intent | Higher — the standard booking-product experience |
| Trust failure | Under-promising; feels manual, maybe abandoned | Over-promising; a shown-then-lost slot is worse than never showing one |
| Artist burden | Ops sets one enum; artists do nothing | Artist must claim, publish, and *maintain* a real schedule |
| Data required | One field | Weekly hours, overrides, buffers, notice, session types, live booking state |
| Deposit semantics | Deposit precedes confirmation; artist may counter | Deposit must confirm a specific slot, or it is a lie |

The asymmetry is the crux: Model B's failure mode is louder than Model A's.
"Availability on request" that turns out to be slow is a mild disappointment;
a booked 2:00 PM Thursday that the artist never actually had is a refund, an
angry client, and a damaged artist relationship.

## What breaks if they coexist

1. **One document, two readers, no discriminator.** `normalizeAvailability`
   collapses any document without a recognized `status` to `"unknown"`. An
   artist who publishes full weekly hours but no `status` field gets
   "Availability on request" on their profile while the slot picker shows
   concrete times on the same page. A document with `status: "closed"` *and*
   recurring hours produces "Books closed" next to a list of bookable slots.
   Neither reader is wrong; there is nothing telling them which model the
   document is written in.
2. **No holds, so slots are not reservations.** The engine filters against
   existing bookings, but nothing reserves a slot between selection and
   payment. Two clients can select the same time and both pay. The engine's
   own docstring describes a holds system that does not exist in the file
   (see #155 item 4) — the design assumes it, the code does not have it.
3. **The deposit flow contradicts Model B.** Today the deposit is captured
   *before* the artist confirms, and the artist may counter with a different
   time. Under Model B, paying should confirm the chosen slot. Shipping slots
   without changing this means a client pays for a specific time and then
   learns the time was provisional.
4. **No artist write path exists.** `firestore.rules` forbids client writes to
   this document, and there is no `/api/v1/artist/availability` route. Model B
   needs artists maintaining their own schedules, which requires the claim flow
   (`claimedByUid`, already built) plus an availability editor (not built). A
   slot calendar backed by ops-entered guesses is precisely the "fake open
   slots" the current model was written to prevent.
5. **Stale schedules fail open.** An artist who publishes hours and then stops
   maintaining them keeps showing bookable slots forever. Model A degrades to
   "unknown"; Model B degrades to lying.

## Recommendation

**Do not let both models read the same document untagged. Make the model an
explicit, per-artist property, default to Model A, and let an artist graduate
to Model B only after they have claimed their profile and published a real
schedule.**

Concretely, if this direction is chosen:

1. Add an explicit discriminator to `artist_availability/{artistId}` — e.g.
   `model: "status" | "schedule"` — and one reader that dispatches on it.
   Absent or unrecognized ⇒ `"status"` with `status: "unknown"`. The honest
   default survives, and the ambiguity in failure 1 disappears.
2. Gate `model: "schedule"` on the artist having claimed the profile
   (`claimedByUid`) and written their own hours through a real editor. Ops must
   not be able to flip an artist into slot mode on their behalf — that would
   recreate fake slots with extra steps.
3. Build holds before any slot is displayed for booking, and move deposit
   capture to confirm the held slot. Without this, Model B is not a reservation
   system, and the principle in `booking.ts:9` is violated in the direction
   that costs the most trust.
4. Keep Model A as the permanent fallback, not a migration stage. Most of the
   ~10k scraped artists will never publish a schedule, and "availability on
   request" is the correct, honest answer for them indefinitely.

The reasoning: the current principle is not timidity, it is a correct read of
the failure asymmetry, and the slot model's prerequisites (claim flow, artist
editor, holds, deposit-confirms-slot) are each real work that is not done. A
discriminator field is the cheapest thing that lets Model B be built and
adopted per-artist without any client ever seeing a slot that was not real.

**The alternative worth weighing against this** is to commit to Model B as the
product direction and treat Model A as legacy — accepting the build cost up
front in exchange for a conventional booking experience and higher conversion.
That is a defensible call, and it is the one this ADR does not make.

## Consequences if adopted

- `normalizeAvailability` gains a discriminator branch; the current status path
  is unchanged and stays the default.
- The scheduling engine stays unwired until holds and the artist editor exist —
  which is already true today, so nothing is delayed by deciding this way.
- ADR 0007's payment split is unaffected either way; only *when* the deposit
  becomes binding changes, and only under Model B.
