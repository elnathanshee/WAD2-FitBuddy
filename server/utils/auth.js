// Password hashing and login tokens, built only on Node's own node:crypto (no extra packages).
// Used by controllers/authController.js (signup/login) and middleware/requireUser.js (checking tokens).
//  - Passwords: salted scrypt hash, compared in constant time.
//  - Login token: a JWT signed with HMAC-SHA256 (HS256), valid for 7 days.

import crypto from 'node:crypto'

const JWT_SECRET =
  process.env.AUTH_SECRET ||
  process.env.DATABASE_URL ||
  'fitbuddy-is216-secure-auth-jwt-secret-key-2026'

/**
 * Hash a plain text password with a random 16-byte salt using scrypt.
 * Returns format: "salt:hexHash"
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string')
  }
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verifies a plain text password against a stored "salt:hexHash".
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false
  }
  try {
    const [salt, key] = storedHash.split(':')
    const keyBuffer = Buffer.from(key, 'hex')
    const derivedKey = crypto.scryptSync(password, salt, 64)
    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  } catch (err) {
    console.error('Password verification error:', err)
    return false
  }
}

/**
 * Creates an HMAC-SHA256 signed JWT token for a user.
 * Valid for 7 days.
 */
export function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days expiration
  const fullPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url')
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${fullPayload}`)
    .digest('base64url')

  return `${header}.${fullPayload}.${signature}`
}

/**
 * Validates a JWT token and returns the decoded payload if valid and unexpired.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')

  if (signature !== expectedSig) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null // Expired
    }
    return data
  } catch {
    return null
  }
}

