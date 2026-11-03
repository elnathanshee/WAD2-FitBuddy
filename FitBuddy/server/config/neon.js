// Database setup for the whole API (Neon serverless PostgreSQL).
//  - getDb() gives every controller the `sql` tagged-template function for queries.
//  - initNeonSchema() creates every table and index if it is missing; server.js runs it at startup.
//  - cleanEnvVar() tidies environment variables pasted into the Vercel dashboard.

// Third-party library: Neon serverless driver (https://github.com/neondatabase/serverless) — runs SQL on the Neon Postgres database
import { neon } from '@neondatabase/serverless'

// The Neon connection is created once and reused
let sqlInstance = null

// Cleans an environment variable value: removes wrapping quotes, a pasted "KEY_NAME=" prefix
// and extra spaces (these often sneak in when pasting into the Vercel settings page).
export function cleanEnvVar(val, keyName) {
  if (!val) return ''
  let cleaned = String(val).trim().replace(/^["']|["']$/g, '').trim()
  if (keyName && cleaned.startsWith(`${keyName}=`)) {
    cleaned = cleaned.slice(keyName.length + 1).trim()
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim()
  }
  return cleaned
}

// Returns the shared `sql` query function. Throws if DATABASE_URL (or NEON_DATABASE_URL) is not set.
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

// Creates every table and index if it does not exist yet (safe to run on every start).
// Order matters: tables that other tables point to (users, habits, habit_groups ...) come first.
export async function initNeonSchema() {
  const sql = getDb()

  // ---- Users and accounts ----
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
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(40);`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_target VARCHAR(80);`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_updated_at TIMESTAMPTZ;`

  // ---- Habits and daily check-ins ----
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

  // ---- Leaderboard cheers and nudges ----
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

  // ---- Friend-vs-friend challenges ----
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

  // ---- Friends ----
  // Friend requests and friendships share one table. Rejecting, cancelling or
  // removing deletes the row, so the same two people can start over later.
  await sql`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      requester_id VARCHAR(100) NOT NULL,
      addressee_id VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      CHECK (requester_id <> addressee_id)
    );
  `

  // An older copy of this table (made before responded_at existed) is brought up to date
  await sql`
    ALTER TABLE friendships ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
  `

  // One row per pair of people, whichever direction the request went
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_friend_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
  `

  // ---- Groups, group activities, check-ins and cheers ----
  await sql`CREATE TABLE IF NOT EXISTS habit_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    owner_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS habit_group_members (
    group_id INTEGER NOT NULL REFERENCES habit_groups(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
  )`
  await sql`CREATE TABLE IF NOT EXISTS group_activities (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES habit_groups(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    points INTEGER NOT NULL CHECK (points BETWEEN 1 AND 1000),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date)
  )`
  await sql`CREATE TABLE IF NOT EXISTS group_activity_members (
    activity_id INTEGER NOT NULL REFERENCES group_activities(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (activity_id, user_id)
  )`
  // Existing activities remain group-wide by default during this migration.
  await sql`INSERT INTO group_activity_members (activity_id, user_id)
    SELECT a.id, m.user_id FROM group_activities a
    JOIN habit_group_members m ON m.group_id = a.group_id
    ON CONFLICT DO NOTHING`
  await sql`CREATE TABLE IF NOT EXISTS group_checkins (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES group_activities(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES habit_groups(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    checkin_date DATE NOT NULL,
    points INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (activity_id, user_id, checkin_date)
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_group_checkins_group_date ON group_checkins(group_id, checkin_date)`
  await sql`ALTER TABLE habits ADD COLUMN IF NOT EXISTS custom_days VARCHAR(100);`
  // ---- Google Health connection (refresh token + one-time OAuth states) ----
  await sql`CREATE TABLE IF NOT EXISTS google_health_connections (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    google_health_user_id VARCHAR(100) NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    granted_scopes TEXT[] NOT NULL DEFAULT '{}',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ
  )`
  await sql`CREATE TABLE IF NOT EXISTS google_health_oauth_states (
    state_hash VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`
  // Cheers sent to a group member for an activity (one per sender, recipient and day)
  await sql`CREATE TABLE IF NOT EXISTS group_activity_cheers (
    activity_id INTEGER NOT NULL REFERENCES group_activities(id) ON DELETE CASCADE,
    from_user_id VARCHAR(100) NOT NULL,
    to_user_id VARCHAR(100) NOT NULL,
    cheer_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (activity_id, from_user_id, to_user_id, cheer_date),
    CHECK (from_user_id <> to_user_id)
  )`

  console.log('✅ Neon PostgreSQL schema verified and ready.')
}
