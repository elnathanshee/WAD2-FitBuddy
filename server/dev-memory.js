// Starts the API against a temporary in-memory MongoDB, pre-loaded with the
// demo data — no Atlas cluster or .env needed. Everything is wiped when the
// server stops (or restarts after a file change).
// Run from the server folder:  npm run dev:memory
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from './app.js'
import { seedDemoUser } from './seedData.js'

const PORT = process.env.PORT || 3000

const mongo = await MongoMemoryServer.create()
await mongoose.connect(mongo.getUri())
const { habits, checkIns } = await seedDemoUser()
console.log(`In-memory MongoDB ready: seeded ${habits} habits and ${checkIns} check-ins (data is NOT saved)`)

app.listen(PORT, () => {
  console.log(`HabitBuddy API running on http://localhost:${PORT}`)
})
