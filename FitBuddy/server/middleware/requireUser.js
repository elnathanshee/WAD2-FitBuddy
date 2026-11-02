// Login check used by almost every route (see app.js and the routes/ files).
// Finds out who is calling and stores their id on req.userId for the controllers to use.
// Accepts either "Authorization: Bearer <token>" (the real login) or an "x-user-id" header
// (kept for tests and the demo-athlete switcher). Otherwise responds 401.

import { verifyToken } from '../utils/auth.js'

// Express middleware: calls next() when the caller is identified, otherwise sends 401.
export function requireUser(req, res, next) {
  // 1. Check Authorization Bearer header
  const authHeader = req.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const decoded = verifyToken(token)
    if (decoded?.userId) {
      req.userId = String(decoded.userId)
      req.user = decoded
      return next()
    }
  }

  // 2. Check x-user-id header fallback
  const fallbackUserId = req.get('x-user-id')
  if (fallbackUserId) {
    req.userId = String(fallbackUserId)
    return next()
  }

  return res.status(401).json({
    message: 'Authentication required. Please log in to access this feature.',
  })
}
