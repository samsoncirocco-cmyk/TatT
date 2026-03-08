-- Migration M003: Bookings table — Phase 3 (monetisation sprint)
-- Source: docs/architecture/next-gen-ux.md §5
-- Run after M002

CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artist_id       UUID REFERENCES tattoo_artists(id) ON DELETE SET NULL,
  design_id       UUID REFERENCES designs(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'inquiry',  -- inquiry | accepted | declined | deposited | completed | cancelled
  deposit_paid    BOOLEAN DEFAULT false,
  stripe_session  TEXT,                             -- Stripe Checkout session ID
  booked_at       TIMESTAMPTZ DEFAULT now(),
  session_date    DATE,
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Lookup: all bookings for a user
CREATE INDEX IF NOT EXISTS idx_bookings_user
  ON bookings (user_id, booked_at DESC);

-- Lookup: all bookings for an artist
CREATE INDEX IF NOT EXISTS idx_bookings_artist
  ON bookings (artist_id, booked_at DESC);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookings_owner_all ON bookings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Artists can read their own bookings via service role (Cloud Function)
-- No RLS policy for artists — access handled at application layer with service key

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();  -- re-uses function from M002
