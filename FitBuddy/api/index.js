// =============================================================================
// [IS216 Project: Vercel Serverless Function Entry Point for FitBuddy Subfolder]
// Mounts Express application and connects to Neon on Vercel.
// =============================================================================

import app from '../server/app.js'
import { initNeonSchema } from '../server/config/neon.js'

let initialized = false

export default async function handler(req, res) {
  // Lazy initialize Neon schema on first live HTTP request
  if (!initialized && (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)) {
    try {
      await initNeonSchema()
    } catch (err) {
      console.error('Neon schema auto-initialization check:', err)
    }
    initialized = true
  }

  return app(req, res)
}
