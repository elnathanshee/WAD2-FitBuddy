// =============================================================================
// [IS216 Project Addition: Neon Serverless PostgreSQL Database Configuration]
// Technology: @neondatabase/serverless
//
// Optimized for Vercel Serverless Functions and local development.
// Automatically initializes PostgreSQL tables (users, habits, check_ins, cheers, challenges).
// =============================================================================

import { neon } from '@neondatabase/serverless'

let sqlInstance = null

/**
 * Robust cleaner for environment variables.
 * Strips accidental wrapping quotes (" or '), leading KEY_NAME= prefixes,
 * and trailing/leading whitespace that often gets pasted into Vercel UI.
 */
export function cleanEnvVar(val, keyName) {
  if (!val) return ''
  let cleaned = String(val).trim().replace(/^["']|["']$/g, '').trim()
  if (keyName && cleaned.startsWith(`${keyName}=`)) {
    cleaned = cleaned.slice(keyName.length + 1).trim()
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim()
  }
  return cleaned
}

export function getDb() {
  const rawConn = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
  const connectionString = cleanEnvVar(rawConn, 'DATABASE_URL') || cleanEnvVar(rawConn, 'NEON_DATABASE_URL')
  if (!connectionString) {
    throw new Error(
      'Missing DATABASE_URL. Please set your Neon PostgreSQL connection string in .env or Vercel Environment Variables'
    )
  }

  if (!sqlInstance) {
    sqlInstance = neon(connectionString)
  }
  return sqlInstance
}

/**
 * Initializes the PostgreSQL tables if they don't already exist.
 */
export async function initNeonSchema() {
  const sql = getDb()

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(100) PRIMARY KEY,
      display_name VARCHAR(60) NOT NULL,
      avatar_color VARCHAR(20) DEFAULT '#7FA3D1',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
  `
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
  `

  await sql`
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      name VARCHAR(50) NOT NULL,
      category VARCHAR(30) DEFAULT 'other',
      frequency VARCHAR(20) DEFAULT 'daily',
      target_amount NUMERIC(10, 2) NOT NULL DEFAULT 1,
      target_unit VARCHAR(20) DEFAULT 'times',
      icon VARCHAR(16) DEFAULT '✅',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
  `

  await sql`
    CREATE TABLE IF NOT EXISTS check_ins (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      count NUMERIC(10, 2) NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(habit_id, date)
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_check_ins_user_date ON check_ins(user_id, date);
  `

  await sql`
    CREATE TABLE IF NOT EXISTS cheers (
      id SERIAL PRIMARY KEY,
      sender_id VARCHAR(100) NOT NULL,
      recipient_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'cheer',
      message VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_cheers_recipient ON cheers(recipient_id);
  `

  // One cheer and one nudge per sender → recipient per day. sent_on is the
  // Singapore calendar day; older rows keep sent_on NULL so they never conflict.
  await sql`
    ALTER TABLE cheers ADD COLUMN IF NOT EXISTS sent_on DATE;
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_cheers_daily ON cheers(sender_id, recipient_id, type, sent_on);
  `

  await sql`
    CREATE TABLE IF NOT EXISTS challenges (
      id SERIAL PRIMARY KEY,
      creator_id VARCHAR(100) NOT NULL,
      opponent_id VARCHAR(100) NOT NULL,
      title VARCHAR(100) NOT NULL,
      habit_category VARCHAR(30) DEFAULT 'exercise',
      target_days INTEGER NOT NULL DEFAULT 7,
      creator_progress INTEGER NOT NULL DEFAULT 0,
      opponent_progress INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      winner_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_challenges_participants ON challenges(creator_id, opponent_id);
  `

  console.log('✅ Neon PostgreSQL schema verified and ready.')
}
