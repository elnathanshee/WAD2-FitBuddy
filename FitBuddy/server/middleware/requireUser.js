// =============================================================================
// [IS216 Project Addition: User Authentication Middleware]
// Technology: JWT verification via server/utils/auth.js + fallback x-user-id
//
// Extracts and verifies JWT from "Authorization: Bearer <token>" header.
// Falls back to "x-user-id" for testing and backward compatibility.
// =============================================================================

import { verifyToken } from '../utils/auth.js'

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
