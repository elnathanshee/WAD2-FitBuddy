// =============================================================================
// [IS216 Project: Vercel Serverless Function Entry Point]
// Mounts Express application and connects to Neon on Vercel.
// =============================================================================

import app from '../server/app.js'
import { initNeonSchema } from '../server/config/neon.js'

// Cold-start initialization for Neon PostgreSQL tables
if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
  initNeonSchema().catch((err) => {
    console.error('Neon schema auto-initialization error:', err)
  })
}

export default app
