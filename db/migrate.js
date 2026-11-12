import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/postgres'
});

async function migrate() {
  await client.connect();
  console.log('Connected to database for migration...');

  // 1. Rename any duplicate shortCodes if they exist
  await client.query(`
    WITH duplicates AS (
      SELECT id, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY created_at) as rn
      FROM urls
    )
    UPDATE urls
    SET code = urls.code || '-' || duplicates.rn
    FROM duplicates
    WHERE urls.id = duplicates.id AND duplicates.rn > 1;
  `);
  console.log('Duplicate shortCodes updated.');

  // 2. Add columns if not exist
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;');
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;');
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS password TEXT;');
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS password_salt TEXT;');
  console.log('Columns clicks, expires_at, password, password_salt ensured.');

  // 3. Add unique constraint on code if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'urls_code_unique'
      ) THEN
        ALTER TABLE urls ADD CONSTRAINT urls_code_unique UNIQUE (code);
      END IF;
    END
    $$;
  `);
  console.log('Unique constraint urls_code_unique ensured.');

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name='urls'
    ORDER BY ordinal_position;
  `);
  console.log('URLs Table Columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

  const sample = await client.query('SELECT id, code, target_url, clicks FROM urls LIMIT 5;');
  console.log('Sample rows:', sample.rows);

  await client.end();
  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
