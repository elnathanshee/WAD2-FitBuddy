import app from './app.js'
import { initNeonSchema } from './config/neon.js'

const PORT = process.env.PORT || 3000

if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
  console.log('Connecting to Neon PostgreSQL...')
  await initNeonSchema()
} else {
  console.warn('Warning: DATABASE_URL is not set. Set DATABASE_URL to your Neon connection string.')
}

app.listen(PORT, () => {
  console.log(`HabitBuddy API running on http://localhost:${PORT}`)
})
