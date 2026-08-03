> **⚠️ Not a current entry point.** This file is not listed in
> `docs/status/document-classification.md`'s "Current entry points" and may be
> stale. Last touched 2026-07-24, this is a design spec (self-dated
> 2026-07-22), not a record of what's implemented. For current scheduling/
> booking feature status see `docs/status/features.yaml` and
> `docs/architecture/current-architecture.md`.

# TatT Scheduling Engine — Custom Cal.com Primitive Spec

> **Date:** 2026-07-22
> **Scope:** The scheduling/booking engine ONLY. Not the full gap analysis — that's in `2026-07-22-booking-gap-analysis.md`.
> **Method:** Cal.com Prisma schema reviewed at source (`calcom/cal.com/packages/prisma/schema.prisma`). Boulevard booking flow reviewed via developer portal.
> **Constraint:** TypeScript + Python + Neo4j. No stack migration.

---

## What Cal.com Actually Does (from their Prisma schema)

Cal.com's scheduling primitives are:

| Model | Purpose | Key Fields |
|---|---|---|
| `EventType` | What you offer (30min consult, 1hr meeting) | `title, slug, length, price, currency, requiresConfirmation, beforeEventBuffer, afterEventBuffer, slotInterval, minimumBookingNotice, schedulingType, recurringEvent, bookingFields (JSON), metadata (JSON)` |
| `Schedule` | A named availability profile ("My Working Hours") | `name, timeZone, availability[]` |
| `Availability` | Recurring weekly blocks | `days[] (1-7), startTime (Time), endTime (Time), date (Date, for overrides)` |
| `Booking` | A confirmed/pending/cancelled reservation | `uid, startTime, endTime, status, attendees[], paid, metadata, cancellationReason, rescheduled, responses (JSON custom answers)` |
| `BookingStatus` | State enum | `ACCEPTED, PENDING, CANCELLED, REJECTED, AWAITING_HOST` |
| `Payment` | Stripe payment linked to booking | Linked via `bookingId` |
| `Webhook` | Lifecycle event triggers | `eventTypeId, subscriberUrl, triggers[]` |

The critical insight from Cal.com: **EventType is the center of the universe, not the calendar.** An artist defines what they offer (consultation, half-day session, full sleeve day), and each event type carries its own duration, price, deposit, buffer time, and booking fields.

---

## TatT Scheduling Engine — Data Model

### Design Principle

Cal.com is a generic scheduler. TatT needs a **tattoo-specific scheduling engine** that extends Cal.com's primitives with:

1. **Artist approval gate** — artist reviews design brief before deposit is collected (Boulevard pattern)
2. **Design intake** — the booking carries the AI-generated design, not just a calendar event
3. **Consult → session pipeline** — free consultation converts to paid multi-hour session
4. **Tattoo-specific buffers** — prep time, healing awareness, body-part constraints
5. **Deposit logic per session type** — flat fee, percentage, or none (Boulevard pattern)

### Mapping Cal.com → TatT

| Cal.com Concept | TatT Equivalent | Tattoo-Specific Extension |
|---|---|---|
| `EventType` | `SessionType` | Carries design intake fields, deposit rules, approval requirement |
| `Schedule` | `ArtistSchedule` | Named recurring weekly hours, per-artist |
| `Availability` | `AvailabilityBlock` | Days + times, with date overrides for blocked/extra dates |
| `Booking` | `Booking` | Carries `design_id`, `session_type_id`, `parent_booking_id` (consult→session), `placement`, `size` |
| `BookingStatus` | `BookingStatus` | Extended with `SLOT_HELD`, `DEPOSIT_PENDING`, `DEPOSIT_PAID`, `ARTIST_REVIEW` |
| `Payment` | `Deposit` | Separate from full session payment (artist collects balance in person) |
| `Webhook` | `WebhookEndpoint` | Booking lifecycle triggers for notifications |

---

## Schema (Supabase + Firestore + Neo4j split)

### Supabase — Structured tables

```sql
-- SessionType (Cal.com EventType equivalent)
CREATE TABLE session_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       TEXT NOT NULL,          -- Neo4j Artist.id
  name            TEXT NOT NULL,          -- "Free Consultation", "Half-Day Session", "Full Sleeve Day"
  slug            TEXT NOT NULL,          -- URL-safe: "consultation", "half-day", "full-sleeve"
  duration_minutes INTEGER NOT NULL,      -- 30, 240, 480
  description     TEXT,
  
  -- Deposit configuration (Boulevard pattern)
  deposit_type    TEXT NOT NULL DEFAULT 'none'
                  CHECK (deposit_type IN ('flat','percentage','none')),
  deposit_amount  INTEGER DEFAULT 0,     -- cents (flat) or basis points (percentage, e.g. 2000 = 20%)
  deposit_currency TEXT DEFAULT 'usd',
  
  -- Scheduling rules (Cal.com pattern)
  requires_approval  BOOLEAN DEFAULT false,   -- artist must review before slot is confirmed
  before_buffer_minutes  INTEGER DEFAULT 30,  -- prep time before session
  after_buffer_minutes   INTEGER DEFAULT 30,  -- cleanup/rest after session
  minimum_booking_notice_hours INTEGER DEFAULT 24, -- can't book less than 24h out
  
  -- Tattoo-specific intake fields (Cal.com bookingFields equivalent)
  intake_fields   JSONB DEFAULT '[]',    -- [{key, label, type, required}, ...]
  
  -- State
  is_active       BOOLEAN DEFAULT true,
  position        INTEGER DEFAULT 0,      -- display order
  
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(artist_id, slug)
);

CREATE INDEX idx_session_types_artist ON session_types(artist_id) WHERE is_active = true;
```

```sql
-- Booking (Cal.com Booking equivalent, tattoo-extended)
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id         UUID REFERENCES auth.users(id),  -- client (Firebase UID mapped to Supabase)
  artist_id       TEXT NOT NULL,                   -- Neo4j Artist.id
  client_name     TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_phone    TEXT,
  
  -- What
  session_type_id UUID REFERENCES session_types(id),
  design_id       UUID,                             -- FK to designs table (AI-generated)
  design_image_url TEXT,                            -- snapshot URL at booking time
  
  -- When (Cal.com stores startTime/endTime; we store date + time + duration for clarity)
  slot_date       DATE NOT NULL,
  slot_start_time TIME NOT NULL,
  slot_end_time   TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Tattoo intake (stored as JSON, like Cal.com's `responses`)
  intake          JSONB DEFAULT '{}',    -- {placement, size, style, budget, description, referenceUrls, skinType, allergies, painTolerance}
  
  -- Pipeline (consult → session)
  parent_booking_id UUID REFERENCES bookings(id),  -- if this booking was created from a consultation
  
  -- State machine
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN (
                    'draft',              -- client started, not submitted
                    'slot_held',          -- slot reserved, 5-min TTL
                    'submitted',           -- client submitted the request
                    'artist_review',      -- artist reviewing (if requires_approval)
                    'approved',            -- artist approved, awaiting deposit
                    'deposit_pending',    -- Stripe checkout initiated
                    'deposit_paid',       -- deposit confirmed via webhook
                    'confirmed',          -- booking is locked in
                    'completed',          -- session happened
                    'cancelled',          -- cancelled by either party
                    'declined',           -- artist declined the request
                    'refunded',           -- deposit refunded
                    'no_show'             -- client didn't show
                  )),
  
  -- Slot hold (race condition prevention)
  held_until      TIMESTAMPTZ,           -- when slot_held, expires after 5 min
  
  -- Payment
  deposit_amount  INTEGER DEFAULT 0,     -- cents, resolved from session_type at booking time
  deposit_paid    BOOLEAN DEFAULT false,
  stripe_session_id     TEXT,
  stripe_payment_intent TEXT,
  
  -- Lifecycle timestamps
  created_at      TIMESTAMPTZ DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    TEXT,                  -- 'client' | 'artist' | 'system'
  cancellation_reason TEXT,
  
  -- Metadata (like Cal.com's metadata JSON)
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_bookings_artist_date ON bookings(artist_id, slot_date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_slot ON bookings(artist_id, slot_date, slot_start_time) WHERE status NOT IN ('draft', 'cancelled', 'declined');
CREATE INDEX idx_bookings_parent ON bookings(parent_booking_id) WHERE parent_booking_id IS NOT NULL;
```

```sql
-- Availability overrides (date-specific blocks or extra openings)
CREATE TABLE availability_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       TEXT NOT NULL,
  date            DATE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('block', 'open')),
  -- For 'open' type: specific hours to add
  start_time      TIME,
  end_time        TIME,
  reason          TEXT,                  -- "vacation", "convention", "extra hours"
  created_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(artist_id, date)
);

CREATE INDEX idx_overrides_artist_date ON availability_overrides(artist_id, date);
```

### Firestore — Recurring schedule + real-time slot holds

```
artists/{artistId}/
  schedule/
    recurring: {
      // Weekly recurring availability (Cal.com Schedule → Availability pattern)
      // day numbers match Cal.com: 1=Sunday, 2=Monday, ... 7=Saturday
      monday: [
        { start: "10:00", end: "13:00" },
        { start: "14:00", end: "18:00" }
      ],
      tuesday: [
        { start: "10:00", end: "18:00" }
      ],
      wednesday: [],
      thursday: [
        { start: "10:00", end: "18:00" }
      ],
      friday: [
        { start: "10:00", end: "16:00" }
      ],
      saturday: [
        { start: "11:00", end: "15:00" }
      ],
      sunday: [],
      timezone: "America/Phoenix"
    }
  
  // Active slot holds (5-min TTL, cleaned up by cron or on read)
  holds/
    {holdId}: {
      slotDate: "2026-08-15",
      slotStart: "14:00",
      slotEnd: "16:00",
      bookingId: "uuid",
      createdAt: timestamp,
      expiresAt: timestamp    // createdAt + 5 min
    }
```

### Neo4j — Graph relationships only

```cypher
// After deposit is confirmed, write the booking edge:
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.id IS UNIQUE;

// (User)-[:BOOKED]->(Artist) with booking metadata as relationship properties
MATCH (u:User {id: $userId}), (a:Artist {id: $artistId})
CREATE (u)-[:BOOKED {
  bookingId: $bookingId,
  sessionType: $sessionTypeName,
  sessionDate: date($slotDate),
  depositPaid: true,
  depositAmount: $depositAmount,
  designAttached: $designId IS NOT NULL,
  bookedAt: datetime()
}]->(a);

// Consult → session pipeline (parent booking links)
MATCH (consult:Booking {id: $consultId})-[:LED_TO]->(session:Booking {id: $sessionId})
// This lets us traverse: "clients who consulted then booked a full session"
```

---

## Booking State Machine

```
                          ┌─────────────────────────────────────────────┐
                          │                                             │
  draft ──→ slot_held ──→ submitted ──→ artist_review ──→ approved ──→ deposit_pending ──→ deposit_paid ──→ confirmed ──→ completed
               │                          │                  │              │                 │              │
               │                          ↓                  ↓              ↓                 ↓              ↓
               │                       declined          declined      deposit_failed    cancelled    cancelled
               │                                          cancelled       (retry)        (refund)
               ↓
            expired (TTL)
```

### State Transitions and Triggers

| From | To | Trigger | Side Effects |
|---|---|---|---|
| `draft` | `slot_held` | Client selects a time slot | Firestore hold created with 5-min TTL |
| `slot_held` | `submitted` | Client submits booking form | Hold extended to 15 min, `submitted_at` set |
| `slot_held` | `expired` | TTL expires | Hold released, slot reopens |
| `submitted` | `artist_review` | `session_type.requires_approval = true` | Artist gets notification |
| `submitted` | `deposit_pending` | `requires_approval = false` | Stripe checkout session created |
| `artist_review` | `approved` | Artist approves | `approved_at` set, Stripe checkout sent to client |
| `artist_review` | `declined` | Artist declines | `rejected_at` set, slot released, client notified |
| `approved` | `deposit_pending` | Client clicks payment link | Stripe checkout session created |
| `deposit_pending` | `deposit_paid` | Stripe webhook `checkout.session.completed` | `deposit_paid = true`, `confirmed_at` set, Neo4j `BOOKED` edge written, slot hold removed |
| `deposit_pending` | `expired` | 24h passes without payment | Slot released, client notified |
| `deposit_paid` | `confirmed` | Same as above (atomic) | Same |
| `confirmed` | `completed` | Artist marks session done | `completed_at` set |
| `confirmed` | `cancelled` | Client or artist cancels | `cancelled_at`, `cancelled_by` set; if >48h before, full refund; if <48h, deposit forfeited per policy |
| `confirmed` | `no_show` | Artist marks no-show | Deposit forfeited, artist notified |
| `cancelled` | `refunded` | Stripe refund processed | `stripe_payment_intent` refunded |

---

## Slot Generation Engine (Cal.com pattern, tattoo-extended)

The core algorithm that turns recurring weekly hours into bookable slots.

### Pseudocode

```
function getAvailableSlots(artistId, dateRangeStart, dateRangeEnd, sessionTypeId):
  
  // 1. Load recurring weekly schedule from Firestore
  schedule = firestore.get(`artists/{artistId}/schedule/recurring`)
  
  // 2. Load date overrides from Supabase
  overrides = supabase.query(
    `SELECT * FROM availability_overrides 
     WHERE artist_id = $1 AND date BETWEEN $2 AND $3`,
    [artistId, dateRangeStart, dateRangeEnd]
  )
  
  // 3. Load existing confirmed/held bookings from Supabase
  existingBookings = supabase.query(
    `SELECT slot_date, slot_start_time, slot_end_time, status 
     FROM bookings 
     WHERE artist_id = $1 AND slot_date BETWEEN $2 AND $3
       AND status NOT IN ('draft','cancelled','declined','expired')`,
    [artistId, dateRangeStart, dateRangeEnd]
  )
  
  // 4. Load session type (determines duration + buffers)
  sessionType = supabase.get(`session_types`, sessionTypeId)
  slotDuration = sessionType.duration_minutes
  beforeBuffer = sessionType.before_buffer_minutes
  afterBuffer = sessionType.after_buffer_minutes
  minNotice = sessionType.minimum_booking_notice_hours
  
  // 5. Load active holds from Firestore
  holds = firestore.get(`artists/{artistId}/holds`)
  // Filter out expired holds (TTL > 5 min)
  activeHolds = holds.filter(h => h.expiresAt > now())
  
  // 6. For each day in range:
  slots = []
  for each date in dateRange:
    
    // Skip past dates and dates within minimum booking notice
    if date < today() + minNotice hours:
      continue
    
    // Check for full-day block override
    blockOverride = overrides.find(o => o.date == date && o.type == 'block')
    if blockOverride && !blockOverride.start_time:
      continue  // entire day blocked
    
    // Get the day's open hours
    dayName = date.dayOfWeek()  // "monday", "tuesday", ...
    openHours = schedule[dayName]
    
    // Apply 'open' override (adds extra hours or replaces)
    openOverride = overrides.find(o => o.date == date && o.type == 'open')
    if openOverride:
      openHours = mergeHours(openHours, openOverride)
    
    if !openHours || openHours.length == 0:
      continue
    
    // 7. For each open-hours block, generate slots
    for each block in openHours:
      blockStart = parseTime(block.start)
      blockEnd = parseTime(block.end)
      
      // Apply before-buffer to first slot
      slotStart = blockStart + beforeBuffer minutes
      
      while slotStart + slotDuration + afterBuffer <= blockEnd:
        slotEnd = slotStart + slotDuration
        
        // Check if this slot overlaps with any existing booking
        isBooked = existingBookings.some(b => 
          b.slot_date == date && 
          timeOverlap(slotStart, slotEnd, b.slot_start_time, b.slot_end_time)
        )
        
        // Check if this slot is held by another client
        isHeld = activeHolds.some(h =>
          h.slotDate == date &&
          timeOverlap(slotStart, slotEnd, h.slotStart, h.slotEnd)
        )
        
        if !isBooked && !isHeld:
          slots.push({
            date: date,
            startTime: slotStart,
            endTime: slotEnd,
            durationMinutes: slotDuration
          })
        
        // Advance by slot interval (default = slotDuration, 
        // but Cal.com supports custom slotInterval for tighter packing)
        slotStart += slotDuration  // or slotInterval if set
      
  return slots
```

### Tattoo-Specific Extensions to Cal.com's Algorithm

| Extension | How It Works | Cal.com Equivalent |
|---|---|---|
| **Body-part buffer** | If artist configures "back pieces need 60min setup", `before_buffer_minutes` varies per session type | Cal.com has `beforeEventBuffer` on EventType — same mechanism |
| **Multi-hour sessions** | `slotDuration` can be 240min (half-day) or 480min (full day). The while-loop naturally generates one slot per block for long sessions. | Cal.com supports arbitrary `length` on EventType |
| **Consult → session** | `parent_booking_id` links the session booking to the originating consultation. Artist dashboard shows pipeline. | No Cal.com equivalent — this is TatT-specific |
| **Design-attached booking** | `design_id` and `design_image_url` carried on the booking record. Artist sees the AI design in the review queue. | No Cal.com equivalent — Cal.com has `customInputs` JSON but no structured design attachment |

---

## API Endpoints

### Artist-Side (auth required, role: 'artist')

| Method | Route | Purpose | DB |
|---|---|---|---|
| `GET` | `/api/v1/session-types?artistId={id}` | List artist's session types | Supabase |
| `POST` | `/api/v1/session-types` | Create session type | Supabase |
| `PATCH` | `/api/v1/session-types/{id}` | Update session type | Supabase |
| `DELETE` | `/api/v1/session-types/{id}` | Deactivate session type | Supabase |
| `GET` | `/api/v1/schedule?artistId={id}` | Get recurring weekly schedule | Firestore |
| `PUT` | `/api/v1/schedule` | Set recurring weekly schedule | Firestore |
| `POST` | `/api/v1/availability/overrides` | Block or open a specific date | Supabase |
| `DELETE` | `/api/v1/availability/overrides/{id}` | Remove override | Supabase |
| `GET` | `/api/v1/bookings?status=pending` | Artist review queue | Supabase |
| `PATCH` | `/api/v1/bookings/{id}/review` | Approve or decline booking | Supabase |
| `PATCH` | `/api/v1/bookings/{id}/complete` | Mark session complete | Supabase |
| `PATCH` | `/api/v1/bookings/{id}/no-show` | Mark client as no-show | Supabase |

### Client-Side (auth optional for booking, required for history)

| Method | Route | Purpose | DB |
|---|---|---|---|
| `GET` | `/api/v1/availability/{artistId}?start={date}&end={date}&sessionType={id}` | Get available slots | Firestore + Supabase |
| `POST` | `/api/v1/bookings` | Create booking (holds slot) | Supabase + Firestore |
| `GET` | `/api/v1/bookings/{id}` | Get booking status | Supabase |
| `POST` | `/api/v1/bookings/{id}/cancel` | Cancel booking | Supabase + Stripe |
| `GET` | `/api/v1/bookings/history` | Client booking history | Supabase |

### Payment (existing, modified)

| Method | Route | Purpose | DB |
|---|---|---|---|
| `POST` | `/api/checkout` | Create Stripe session (modified: reads deposit from session_type) | Stripe + Supabase |
| `POST` | `/api/webhooks/stripe` | **FIX**: Write booking record, mark deposit paid, write Neo4j edge, release hold | All three |

---

## Frontend State (Zustand)

### `useAvailabilityStore` (new)

```typescript
interface Slot {
  date: string;          // ISO date
  startTime: string;    // "14:00"
  endTime: string;      // "16:00"
  durationMinutes: number;
}

interface AvailabilityState {
  slots: Slot[];
  selectedSlot: Slot | null;
  isLoading: boolean;
  error: string | null;
  
  // Client-side
  fetchAvailability: (artistId: string, sessionTypeId: string, start: string, end: string) => Promise<void>;
  selectSlot: (slot: Slot | null) => void;
  
  // Artist-side
  recurringSchedule: WeeklySchedule | null;
  overrides: AvailabilityOverride[];
  saveRecurringSchedule: (schedule: WeeklySchedule) => Promise<void>;
  addOverride: (override: AvailabilityOverride) => Promise<void>;
  removeOverride: (id: string) => Promise<void>;
}
```

### `useBookingStore` (modified)

Add to existing interface:
```typescript
// Add to BookingState:
sessionTypes: SessionType[];
selectedSessionType: SessionType | null;
fetchSessionTypes: (artistId: string) => Promise<void>;
selectSessionType: (st: SessionType | null) => void;

// Booking interface gains:
sessionTypeId: string | null;
parentBookingId: string | null;  // consult → session pipeline
```

---

## Tattoo-Specific Session Type Presets

These are seed `SessionType` rows that artists can use or customize:

| Name | Duration | Deposit | Approval | Buffers |
|---|---|---|---|---|
| Free Consultation | 30 min | none | yes (artist reviews brief) | 15 min before, 0 after |
| Small Piece (≤4") | 120 min | $75 flat | no | 30 min before, 30 after |
| Medium Piece (4-8") | 240 min | $150 flat | no | 45 min before, 45 after |
| Half-Day Session | 240 min | $200 flat | yes | 45 min before, 45 after |
| Full-Day Session | 480 min | $300 flat | yes | 60 min before, 60 after |
| Full Sleeve (multi-session) | 480 min | 20% of estimate | yes | 60 min before, 60 after |

### Intake Fields per Session Type

Cal.com uses `bookingFields` JSON on `EventType`. TatT uses `intake_fields` JSONB on `session_types`:

```json
// Free Consultation intake fields
[
  {"key": "description", "label": "What do you want to get?", "type": "textarea", "required": true},
  {"key": "placement", "label": "Where on your body?", "type": "select", "options": ["Forearm","Upper Arm","Shoulder","Back","Chest","Ribcage","Thigh","Calf","Ankle","Neck","Hand","Other"], "required": true},
  {"key": "size", "label": "Approximate size", "type": "select", "options": ["Under 2\"","2-4\"","4-8\"","8+\"","Sleeve"], "required": true},
  {"key": "budget", "label": "Budget range", "type": "select", "options": ["Under $300","$300-$600","$600-$1200","$1200-$2500","$2500+","Flexible"], "required": true},
  {"key": "designId", "label": "AI Design (optional)", "type": "design-attach", "required": false},
  {"key": "referenceUrls", "label": "Reference images", "type": "image-upload", "required": false},
  {"key": "skinType", "label": "Skin type", "type": "select", "options": ["Fair","Medium","Olive","Dark","Unknown"], "required": false},
  {"key": "allergies", "label": "Any allergies?", "type": "text", "required": false},
  {"key": "previousTattoos", "label": "How many tattoos do you have?", "type": "select", "options": ["This is my first","1-3","4-10","10+"], "required": false}
]
```

---

## Phase 2: Calendar Sync

Artists live on Google Calendar and Apple Calendar. If TatT doesn't push bookings to their existing calendar, they won't use it — they'll keep double-booking manually.

### How Cal.com Does It

Cal.com syncs bidirectionally via OAuth:

- **Push:** When a booking is confirmed, Cal.com creates a calendar event on the artist's connected Google/Outlook calendar via the Calendar API. The event carries the booking title, time, client info, and a cancellation link.
- **Pull:** Cal.com polls the artist's calendar for busy/free times and merges them into slot generation. A slot that overlaps with a Google Calendar event is excluded from availability, even if the TatT schedule says the artist is open.
- **Credential storage:** OAuth tokens stored encrypted in the `Credential` model (type: `google_calendar`, key: encrypted JSON with access + refresh tokens).

### TatT Implementation

| Component | Implementation | DB |
|---|---|---|
| Google OAuth flow | Next.js API route `/api/auth/google-calendar` — initiates OAuth, stores tokens | Supabase `calendar_credentials` table |
| `calendar_credentials` table | `id, artist_id, provider ('google'\|'apple'), access_token (encrypted), refresh_token (encrypted), token_expires_at, calendar_id, created_at` | Supabase |
| Push on booking confirm | When booking transitions to `confirmed`, create Google Calendar event via Calendar API | Google Calendar API |
| Pull for slot generation | Before returning slots, query Google Calendar `freebusy` API for the date range and filter out busy times | Google Calendar API |
| Apple Calendar (CalDAV) | Phase 2.1 — CalDAV sync via `caldav-client` npm package | Supabase |

### Schema Addition

```sql
CREATE TABLE calendar_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       TEXT NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'outlook')),
  access_token    TEXT NOT NULL,    -- encrypted at rest
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id     TEXT,             -- Google calendar ID or CalDAV calendar URL
  sync_enabled    BOOLEAN DEFAULT true,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(artist_id, provider)
);

CREATE INDEX idx_calendar_creds_artist ON calendar_credentials(artist_id) WHERE sync_enabled = true;
```

### Slot Generation Extension

```
// After step 5 in the slot generation algorithm, add:

// 6.5. Check external calendars (Google/Apple) for busy times
if artistHasCalendarSync(artistId):
  externalBusy = googleCalendar.freebusy(artistId, dateRangeStart, dateRangeEnd)
  // Filter out slots that overlap with external busy times
  slots = slots.filter(slot => 
    !externalBusy.some(busy => 
      timeOverlap(slot.startTime, slot.endTime, busy.start, busy.end)
    )
  )
```

### Booking Confirmation Calendar Push

```typescript
// src/services/calendarSyncService.ts (new)

async function pushBookingToCalendar(booking: Booking): Promise<void> {
  const creds = await supabase
    .from('calendar_credentials')
    .select('*')
    .eq('artist_id', booking.artist_id)
    .eq('sync_enabled', true)
    .single();
  
  if (!creds) return;  // artist hasn't connected a calendar
  
  if (creds.provider === 'google') {
    const calendar = google.calendar({ version: 'v3', auth: await refreshGoogleToken(creds) });
    await calendar.events.insert({
      calendarId: creds.calendar_id || 'primary',
      requestBody: {
        summary: `TatT Booking — ${booking.client_name} (${booking.session_type_name})`,
        description: `Design: ${booking.design_image_url || 'N/A'}\nPlacement: ${booking.intake.placement}\nSize: ${booking.intake.size}\nNotes: ${booking.intake.description}`,
        start: { dateTime: `${booking.slot_date}T${booking.slot_start_time}:00`, timeZone: 'America/Phoenix' },
        end: { dateTime: `${booking.slot_date}T${booking.slot_end_time}:00`, timeZone: 'America/Phoenix' },
        attendees: [{ email: booking.client_email, name: booking.client_name }],
        metadata: { tattBookingId: booking.id },
      },
    });
  }
  // Apple CalDAV: similar via caldav-client
}
```

### Webhook: Booking Cancelled → Calendar Event Deleted

When a booking transitions to `cancelled`, delete the corresponding calendar event:

```typescript
async function deleteCalendarEvent(booking: Booking): Promise<void> {
  // Find the event by metadata.tattBookingId
  // Delete it from Google Calendar
}
```

---

## Phase 3: Stripe Connect — Artist Payouts

Deposits currently go to a single Stripe account (TatT's). For a marketplace, the deposit should split: TatT takes a platform fee, the artist gets the rest. This requires Stripe Connect.

### How It Works

1. Artist creates a Stripe Connect account via TatT onboarding (Stripe-hosted onboarding form — no KYC handling on our side)
2. When a client pays a deposit, the payment is split:
   - Platform fee → TatT's Stripe account (e.g., 5% of deposit)
   - Remaining → Artist's connected Stripe account (transfer)
3. When a booking is cancelled and refunded, the transfer is reversed

### Schema Addition

```sql
-- Artist Stripe Connect accounts
CREATE TABLE stripe_connect_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       TEXT NOT NULL UNIQUE,
  stripe_account_id   TEXT NOT NULL,      -- acct_xxx
  account_status  TEXT DEFAULT 'pending'   -- 'pending' | 'restricted' | 'active'
                    CHECK (account_status IN ('pending','restricted','active')),
  payouts_enabled BOOLEAN DEFAULT false,
  bank_account_last4 TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Payment splits for each booking deposit
CREATE TABLE deposit_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID REFERENCES bookings(id),
  stripe_payment_intent_id TEXT NOT NULL,
  platform_fee_cents   INTEGER NOT NULL,   -- TatT's cut
  artist_amount_cents  INTEGER NOT NULL,    -- artist's transfer
  transfer_id     TEXT,                     -- Stripe transfer ID (tr_xxx)
  transfer_status TEXT DEFAULT 'pending',  -- 'pending' | 'transferred' | 'reversed'
  transferred_at  TIMESTAMPTZ,
  reversed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deposit_splits_booking ON deposit_splits(booking_id);
CREATE INDEX idx_stripe_connect_artist ON stripe_connect_accounts(artist_id);
```

### API Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/v1/stripe/connect/onboard` | Create Stripe Connect account for artist (returns onboarding URL) |
| `GET` | `/api/v1/stripe/connect/status` | Check artist's Connect account status |
| `POST` | `/api/v1/stripe/connect/refresh` | Refresh onboarding link if expired |

### Checkout Modification (Stripe Connect)

```typescript
// Modified /api/checkout route — uses Stripe Connect if artist has an account

const connectAccount = await supabase
  .from('stripe_connect_accounts')
  .select('stripe_account_id, account_status')
  .eq('artist_id', artistId)
  .single();

const stripeParams = {
  // ... existing params ...
  'line_items[0][price_data][unit_amount]': depositAmountInCents,
  'line_items[0][quantity]': '1',
  'metadata[bookingId]': bookingId,
};

if (connectAccount?.account_status === 'active') {
  // Split payment: platform fee + artist transfer
  stripeParams['application_fee_amount'] = Math.round(depositAmountInCents * 0.05); // 5% platform fee
  stripeParams['transfer_data[destination]'] = connectAccount.stripe_account_id;
}

const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form.toString(),
});
```

### Webhook: Deposit Paid → Transfer to Artist

```typescript
// In /api/webhooks/stripe — after marking deposit_paid:

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const connectAccount = await getConnectAccount(session.metadata.artistId);
  
  if (connectAccount) {
    // The transfer happens automatically via transfer_data on the checkout session
    // But we record it for tracking
    await supabase.from('deposit_splits').insert({
      booking_id: session.metadata.bookingId,
      stripe_payment_intent_id: session.payment_intent,
      platform_fee_cents: session.application_fee_amount,
      artist_amount_cents: session.amount_total - session.application_fee_amount,
      transfer_status: 'transferred',
      transferred_at: new Date().toISOString(),
    });
  }
}
```

### Webhook: Booking Cancelled → Reverse Transfer

```typescript
async function refundDeposit(bookingId: string): Promise<void> {
  const booking = await getBooking(bookingId);
  const split = await getDepositSplit(bookingId);
  
  // Refund the payment intent (returns money to client)
  await stripe.refunds.create({
    payment_intent: booking.stripe_payment_intent,
  });
  
  // Reverse the transfer to the artist (returns the artist's cut to platform)
  if (split?.transfer_id) {
    await stripe.transfers.createReversal(split.transfer_id, {
      amount: split.artist_amount_cents,
    });
  }
  
  await updateDepositSplit(split.id, {
    transfer_status: 'reversed',
    reversed_at: new Date().toISOString(),
  });
}
```

### Artist Onboarding Integration

The artist onboarding wizard (Phase 2) gets a new step:

```
Step 4: Set up payments
  → "Connect with Stripe" button
  → Stripe-hosted onboarding (KYC, bank account, tax info — all handled by Stripe)
  → Redirect back to TatT dashboard
  → `stripe_connect_accounts.account_status` = 'active'
  → Artist can now receive deposit splits
```

### Cancellation Policy Enforcement

The refund logic respects the artist's cancellation policy:

| Time Before Session | Refund Amount | Transfer Reversal |
|---|---|---|
| > 72 hours | 100% refund | Full reversal |
| 48-72 hours | 50% refund | 50% reversal (artist keeps half) |
| < 48 hours | 0% refund (deposit forfeited) | No reversal (artist keeps full deposit) |
| No-show | 0% refund | No reversal |

The policy is configurable per artist in their dashboard:

```sql
ALTER TABLE session_types ADD COLUMN IF NOT EXISTS
  cancellation_policy_hours_full_refund INTEGER DEFAULT 72;
ALTER TABLE session_types ADD COLUMN IF NOT EXISTS
  cancellation_policy_hours_partial_refund INTEGER DEFAULT 48;
ALTER TABLE session_types ADD COLUMN IF NOT EXISTS
  cancellation_policy_partial_refund_percentage INTEGER DEFAULT 50; -- basis points: 5000 = 50%
```
