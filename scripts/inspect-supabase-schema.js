import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TABLE_NAME = process.argv[2] || 'artist_portfolios';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  const query = `
    select column_name, data_type
    from information_schema.columns
    where table_name = $1
    order by ordinal_position;
  `;

  const { data, error } = await supabase.rpc('sql', {
    query,
    params: [TABLE_NAME]
  });

  if (error) {
    console.error('Failed to read schema:', error.message || error);
    process.exit(1);
  }

  console.log(`\nColumns for table: ${TABLE_NAME}`);
  if (!data || data.length === 0) {
    console.log('No columns found. Check table name.');
    return;
  }

  data.forEach((row) => {
    console.log(`- ${row.column_name}: ${row.data_type}`);
  });
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
