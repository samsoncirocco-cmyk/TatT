# Supabase Setup Guide

## Project Information

**Project Name**: TatT-Artists  
**Project ID**: `yfcmysjmoehcyszvkxsr`  
**Project URL**: https://yfcmysjmoehcyszvkxsr.supabase.co  
**Region**: us-east-1  
**Cost**: $0/month (Free tier)

## Current Status

✅ **Database Created**: The `tattoo_artists` table has been created with all necessary indexes.  
✅ **Data Injected**: 50 sample artist records have been successfully loaded.  
✅ **Statistics**:
- Total Artists: 50
- Curated Artists: 24
- Non-Curated Artists: 26

## Dashboard Access

- **Main Dashboard**: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr
- **Table Editor**: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor
- **API Settings**: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new

## Environment Variables

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL`: Already set to https://yfcmysjmoehcyszvkxsr.supabase.co
- `SUPABASE_ANON_KEY`: Already set in .env.example (public key, safe to commit)
- `SUPABASE_SERVICE_KEY`: Get from [API Settings](https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/settings/api) (keep secret!)

## Database Schema

### `tattoo_artists` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | TEXT | Artist name |
| `location_city` | TEXT | City |
| `location_region` | TEXT | State/Province/Region |
| `location_country` | TEXT | Country |
| `has_multiple_locations` | BOOLEAN | Multi-location flag |
| `profile_url` | TEXT | Artist profile URL |
| `is_curated` | BOOLEAN | Curated artist flag |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `styles` | TEXT[] | Array of style tags |
| `color_palettes` | TEXT[] | Array of color palette tags |
| `specializations` | TEXT[] | Array of specialization tags |

### Indexes

- `idx_tattoo_artists_location_city` - B-tree index on `location_city`
- `idx_tattoo_artists_location_region` - B-tree index on `location_region`
- `idx_tattoo_artists_location_country` - B-tree index on `location_country`
- `idx_tattoo_artists_is_curated` - B-tree index on `is_curated`
- `idx_tattoo_artists_styles` - GIN index on `styles` array
- `idx_tattoo_artists_color_palettes` - GIN index on `color_palettes` array
- `idx_tattoo_artists_specializations` - GIN index on `specializations` array

## Sample Queries

### Get All Curated Artists in Austin, TX
```sql
SELECT * FROM tattoo_artists 
WHERE location_city = 'Austin' 
  AND location_region = 'Texas' 
  AND is_curated = true;
```

### Search by Style (Array contains)
```sql
SELECT * FROM tattoo_artists 
WHERE 'Watercolor' = ANY(styles);
```

### Multi-Filter Search (City + Style + Specialization)
```sql
SELECT * FROM tattoo_artists 
WHERE location_city = 'San Diego'
  AND 'Fine Line' = ANY(styles)
  AND 'Portraits' = ANY(specializations);
```

### Get All Artists with Multiple Locations
```sql
SELECT * FROM tattoo_artists 
WHERE has_multiple_locations = true;
```

## Next Steps

1. **Enable Row Level Security (RLS)**: 
   - Go to [Table Editor](https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor)
   - Click on `tattoo_artists` table
   - Enable RLS and create policies

2. **Add More Data**:
   - Run the data generation script: `node scripts/setup-supabase-tattoo-artists.js`
   - Or manually add via SQL Editor

3. **Integrate with Frontend**:
   - Use `@supabase/supabase-js` client (already in package.json)
   - See `src/services/supabaseService.js` for integration patterns

4. **Set Up Storage** (for tattoo design images):
   - Create a `tattoo-designs` bucket
   - Enable public access for generated images
   - Update `storageService.js` to use Supabase Storage

## Troubleshooting

### "Invalid API Key" Error
- Make sure you copied the correct anon key from the dashboard
- Verify the `.env` file is in the project root
- Restart your dev server after updating `.env`

### "Row Level Security" Errors
- If RLS is enabled, you'll need to create policies
- For development, you can temporarily disable RLS or use the service_role key

### Data Not Showing Up
- Check that the table exists: `SELECT * FROM tattoo_artists LIMIT 1;`
- Verify row count: `SELECT COUNT(*) FROM tattoo_artists;`
- Check browser console for CORS or network errors

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

