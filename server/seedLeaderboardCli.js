// Seeds the leaderboard rivals into a real database (Atlas).
// Run from the server folder:  npm run seed:leaderboard
//
// Safe to run against the shared cluster: it only touches users 2-5 and the
// display-name profiles. It never deletes habits or check-ins belonging to
// the demo user or to anyone else.
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { seedLeaderboardRivals } from './seedLeaderboard.js'

await connectDB(process.env.MONGODB_URI)
const result = await seedLeaderboardRivals()
console.log(`Seeded ${result.profiles} profiles, ${result.habits} rival habits, ${result.checkIns} check-ins.`)
await mongoose.disconnect()
