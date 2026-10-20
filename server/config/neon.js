// =============================================================================
// [IS216 Project Addition: Neon Serverless PostgreSQL Database Configuration]
// Technology: @neondatabase/serverless
//
// Optimized for Vercel Serverless Functions and local development.
// Automatically initializes PostgreSQL tables (users, habits, check_ins).
// =============================================================================

import { neon } from '@neondatabase/serverless'

let sqlInstance = null

export function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'Missing DATABASE_URL. Please set your Neon PostgreSQL connection string in .env'
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

  console.log('✅ Neon PostgreSQL schema verified and ready.')
}

