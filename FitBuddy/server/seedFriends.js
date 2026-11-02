// Seed script for demo friendships (run by hand, never by the app).
// Usage: npm run seed:friends   (node --env-file-if-exists=.env seedFriends.js)
// Adds demo friendships between the demo user and the rival athletes. Additive
// and safe to run repeatedly: it never deletes anything. seedNeon.js calls it too.

import { getDb, initNeonSchema } from './config/neon.js'

// rival_david is left unconnected so searching and "Add friend" can be demoed
const DEMO_FRIENDSHIPS = [
  { requester: '1', addressee: 'rival_alex', status: 'accepted' },
  { requester: 'rival_bernice', addressee: '1', status: 'accepted' },
  { requester: 'rival_charlie', addressee: '1', status: 'pending' },
]

// Inserts the demo friendships; rows that already exist are left alone
export async function insertDemoFriendships(sql) {
  for (const f of DEMO_FRIENDSHIPS) {
    await sql`
      INSERT INTO friendships (requester_id, addressee_id, status, responded_at)
      VALUES (${f.requester}, ${f.addressee}, ${f.status}, ${f.status === 'accepted' ? new Date() : null})
      ON CONFLICT DO NOTHING
    `
  }
}

// Makes sure the tables exist, then inserts the demo friendships
async function seedFriends() {
  await initNeonSchema()
  await insertDemoFriendships(getDb())
  console.log(`✅ Demo friendships ready (${DEMO_FRIENDSHIPS.length} rows, existing ones left as they are).`)
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seedFriends.js')) {
  try {
    await seedFriends()
    process.exit(0)
  } catch (err) {
    console.error('Error seeding friendships:', err)
    process.exit(1)
  }
}
