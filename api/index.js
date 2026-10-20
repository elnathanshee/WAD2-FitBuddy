// =============================================================================
// [IS216 Project: Vercel Serverless Function Entry Point]
// Routes incoming /api/* requests to the Express server application.
// =============================================================================

import app from '../server/app.js'
import { initNeonSchema } from '../server/config/neon.js'

let initialized = false

export default async function handler(req, res) {
  // Ensure Neon schema is ready on first invocation if DATABASE_URL is provided
  if (!initialized && (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)) {
    try {
      await initNeonSchema()
      initialized = true
    } catch (err) {
      console.error('Neon schema initialization check:', err)
    }
  }
  return app(req, res)
}

