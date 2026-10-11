// Seeds demo habits + 60 days of check-in history for the mock login user.
// Run from the server folder:  npm run seed
// Safe to re-run: it deletes and recreates ONLY the demo user's data.
// The demo data itself lives in seedData.js.
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { seedDemoUser, DEMO_USER_ID } from './seedData.js'

await connectDB(process.env.MONGODB_URI)

const { habits, checkIns, today } = await seedDemoUser()

console.log(`Seeded ${habits} habits and ${checkIns} check-ins for user "${DEMO_USER_ID}" (today = ${today}).`)
await mongoose.disconnect()
