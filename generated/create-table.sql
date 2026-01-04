
CREATE TABLE IF NOT EXISTS tattoo_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_region TEXT NOT NULL,
  location_country TEXT NOT NULL,
  has_multiple_locations BOOLEAN DEFAULT FALSE,
  profile_url TEXT,
  is_curated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  styles TEXT[] DEFAULT '{}',
  color_palettes TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_city ON tattoo_artists(location_city);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_region ON tattoo_artists(location_region);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_country ON tattoo_artists(location_country);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_is_curated ON tattoo_artists(is_curated);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_styles ON tattoo_artists USING GIN(styles);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_color_palettes ON tattoo_artists USING GIN(color_palettes);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_specializations ON tattoo_artists USING GIN(specializations);
