import app from './app.js'
import { connectDB } from './config/db.js'
import { initNeonSchema } from './config/neon.js'

const PORT = process.env.PORT || 3000

if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
  console.log('Connecting to Neon PostgreSQL...')
  await initNeonSchema()
} else if (process.env.MONGODB_URI) {
  await connectDB(process.env.MONGODB_URI)
} else {
  console.warn('Warning: Neither DATABASE_URL nor MONGODB_URI is set. Set DATABASE_URL for Neon.')
}

app.listen(PORT, () => {
  console.log(`HabitBuddy API running on http://localhost:${PORT}`)
})
