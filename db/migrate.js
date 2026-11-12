import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/postgres'
});

async function migrate() {
  await client.connect();
  console.log('Connected to database for migration...');

  // 1. Ensure pgcrypto extension for gen_random_uuid()
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  console.log('pgcrypto extension ensured.');

  // 2. Create users table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "firstName" VARCHAR(55) NOT NULL,
      "lastName" VARCHAR(55),
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP
    );
  `);
  console.log('Users table ensured.');

  // 3. Create urls table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS urls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(155) NOT NULL,
      target_url TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clicks INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP,
      password TEXT,
      password_salt TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP
    );
  `);
  console.log('URLs table ensured.');

  // 4. In case table already existed, ensure new columns are present
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;');
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;');
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS password TEXT;');
  await client.query('ALTER TABLE urls ADD COLUMN IF NOT EXISTS password_salt TEXT;');
  console.log('Columns clicks, expires_at, password, password_salt ensured.');

  // 5. Ensure unique constraint on code
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

  await client.end();
  console.log('Database migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
