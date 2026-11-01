// =============================================================================
// [IS216 Project Addition: Authentication Controller with Neon PostgreSQL]
// Technology: Express.js + Neon PostgreSQL + node:crypto salted scrypt hashing
//
// Features:
// - User Registration with password hashing and initial habit bootstrapping
// - Secure Login with JWT generation
// - Profile resolution and Demo User switching
// =============================================================================

import { getDb } from '../config/neon.js'
import { hashPassword, verifyPassword, createToken } from '../utils/auth.js'

const AVATAR_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EC4899',
  '#8B5CF6', '#06B6D4', '#EF4444', '#14B8A6',
]

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
export async function signup(req, res) {
  const { name, email, password } = req.body || {}
  const allowedGoals = ['wellness', 'weight-loss', 'muscle-gain', 'cardio', 'strength', 'mobility', 'sleep']
  const primaryGoal = allowedGoals.includes(req.body?.primaryGoal) ? req.body.primaryGoal : 'wellness'
  const goalTarget = typeof req.body?.goalTarget === 'string' ? req.body.goalTarget.trim().slice(0, 80) : ''

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ message: 'Full name is required.' })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ message: 'A valid email address is required.' })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' })
  }

  const cleanName = name.trim().slice(0, 60)
  const cleanEmail = email.trim().toLowerCase()
  const sql = getDb()

  // 1. Check if email already registered
  const existing = await sql`
    SELECT user_id FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1
  `
  if (existing.length > 0) {
    return res.status(409).json({ message: 'An account with this email address already exists.' })
  }

  // 2. Hash password & prepare user record
  const passwordHash = hashPassword(password)
  const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  const inserted = await sql`
    INSERT INTO users (user_id, display_name, email, password_hash, avatar_color, primary_goal, goal_target, goal_updated_at)
    VALUES (${userId}, ${cleanName}, ${cleanEmail}, ${passwordHash}, ${randomColor}, ${primaryGoal}, ${goalTarget || null}, NOW())
    RETURNING user_id, display_name, email, avatar_color
  `
  const newUser = inserted[0]

  // 3. Bootstrap starter habits so new user has actionable cards immediately
  const starterHabits = getGoalHabits(primaryGoal)

  for (const h of starterHabits) {
    await sql`
      INSERT INTO habits (user_id, name, category, frequency, target_amount, target_unit, icon)
      VALUES (${userId}, ${h.name}, ${h.category}, ${h.frequency}, ${h.targetAmount}, ${h.targetUnit}, ${h.icon})
    `
  }

  // 4. Generate JWT Token
  const token = createToken({
    userId: newUser.user_id,
    email: newUser.email,
    name: newUser.display_name,
  })

  res.status(201).json({
    message: 'Account created successfully!',
    token,
    user: {
      id: newUser.user_id,
      name: newUser.display_name,
      email: newUser.email,
      avatarColor: newUser.avatar_color,
    },
  })
}

function getGoalHabits(goal) {
  const common = {
    wellness: [
      ['Drink water', 'water', 8, 'glasses', '💧'], ['Take a mindful break', 'mindfulness', 10, 'minutes', '🌿'], ['Go for a walk', 'exercise', 20, 'minutes', '🚶'],
    ],
    'weight-loss': [
      ['Take a brisk walk', 'exercise', 30, 'minutes', '🚶'], ['Drink water', 'water', 8, 'glasses', '💧'], ['Log a balanced meal', 'nutrition', 1, 'times', '🥗'],
    ],
    'muscle-gain': [
      ['Strength training', 'exercise', 1, 'times', '🏋️'], ['Eat a protein-rich meal', 'nutrition', 1, 'times', '🍽️'], ['Sleep well', 'sleep', 8, 'hours', '😴'],
    ],
    cardio: [
      ['Cardio workout', 'exercise', 30, 'minutes', '❤️‍🔥'], ['Take a brisk walk', 'exercise', 20, 'minutes', '🚶'], ['Stretch', 'exercise', 5, 'minutes', '🧘'],
    ],
    strength: [
      ['Strength training', 'exercise', 1, 'times', '🏋️'], ['Warm up', 'exercise', 5, 'minutes', '🔥'], ['Stretch', 'exercise', 5, 'minutes', '🧘'],
    ],
    mobility: [
      ['Morning stretch', 'exercise', 10, 'minutes', '🧘'], ['Take a movement break', 'exercise', 5, 'minutes', '🤸'], ['Practice yoga', 'exercise', 15, 'minutes', '🌱'],
    ],
    sleep: [
      ['Keep a bedtime routine', 'sleep', 1, 'times', '🌙'], ['Avoid screens before bed', 'sleep', 30, 'minutes', '📵'], ['Get morning daylight', 'wellness', 10, 'minutes', '☀️'],
    ],
  }
  return common[goal].map(([name, category, targetAmount, targetUnit, icon]) => ({ name, category, frequency: 'daily', targetAmount, targetUnit, icon }))
}

export async function getGoal(req, res) {
  const sql = getDb()
  const rows = await sql`SELECT primary_goal, goal_target, goal_updated_at FROM users WHERE user_id = ${req.userId} LIMIT 1`
  if (!rows.length) return res.status(404).json({ message: 'User not found.' })
  res.json({ goal: { primaryGoal: rows[0].primary_goal || 'wellness', goalTarget: rows[0].goal_target || '', updatedAt: rows[0].goal_updated_at } })
}

export async function updateGoal(req, res) {
  const allowedGoals = ['wellness', 'weight-loss', 'muscle-gain', 'cardio', 'strength', 'mobility', 'sleep']
  const primaryGoal = req.body?.primaryGoal
  if (!allowedGoals.includes(primaryGoal)) return res.status(400).json({ message: 'Choose a valid goal.' })
  const goalTarget = typeof req.body?.goalTarget === 'string' ? req.body.goalTarget.trim().slice(0, 80) : ''
  const sql = getDb()
  const rows = await sql`UPDATE users SET primary_goal = ${primaryGoal}, goal_target = ${goalTarget || null}, goal_updated_at = NOW(), updated_at = NOW() WHERE user_id = ${req.userId} RETURNING primary_goal, goal_target, goal_updated_at`
  if (!rows.length) return res.status(404).json({ message: 'User not found.' })
  res.json({ goal: { primaryGoal: rows[0].primary_goal, goalTarget: rows[0].goal_target || '', updatedAt: rows[0].goal_updated_at } })
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res) {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  const cleanEmail = String(email).trim().toLowerCase()
  const sql = getDb()

  // 1. Fetch user by email
  const rows = await sql`
    SELECT user_id, display_name, email, password_hash, avatar_color
    FROM users
    WHERE LOWER(email) = ${cleanEmail}
    LIMIT 1
  `

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const user = rows[0]

  // 2. Verify password hash
  if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  // 3. Generate token
  const token = createToken({
    userId: user.user_id,
    email: user.email,
    name: user.display_name,
  })

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.user_id,
      name: user.display_name,
      email: user.email,
      avatarColor: user.avatar_color,
    },
  })
}

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
export async function getCurrentUser(req, res) {
  const sql = getDb()
  const rows = await sql`
    SELECT user_id, display_name, email, avatar_color
    FROM users
    WHERE user_id = ${req.userId}
    LIMIT 1
  `

  if (rows.length === 0) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const u = rows[0]
  res.json({
    user: {
      id: u.user_id,
      name: u.display_name,
      email: u.email,
      avatarColor: u.avatar_color,
    },
  })
}

/**
 * GET /api/auth/demo-users
 * Returns list of seeded demo profiles with pre-filled test credentials
 */
export async function getDemoUsers(req, res) {
  const sql = getDb()
  const rows = await sql`
    SELECT user_id, display_name, email, avatar_color
    FROM users
    WHERE email IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 8
  `

  const demoAccounts = rows.map((u) => ({
    id: u.user_id,
    name: u.display_name,
    email: u.email,
    avatarColor: u.avatar_color,
  }))

  res.json({ demoAccounts })
}


/**
 * PUT /api/auth/profile
 * Body: { name, avatarColor }
 *
 * Lets a signed-in user rename themselves and pick an avatar colour. Only those
 * two fields can be changed here - the email and the password hash are never
 * read from the body, so a request cannot overwrite them.
 */
export async function updateProfile(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const avatarColor = typeof req.body?.avatarColor === 'string' ? req.body.avatarColor.trim() : ''

  if (name.length < 2) {
    return res.status(400).json({ message: 'Your name needs at least 2 characters.' })
  }
  if (name.length > 60) {
    return res.status(400).json({ message: 'Your name must be 60 characters or fewer.' })
  }
  // Only one of the colours we actually offer is accepted, so nothing
  // unexpected can be stored and shown back on the page.
  if (!AVATAR_COLORS.includes(avatarColor)) {
    return res.status(400).json({ message: 'Please choose one of the avatar colours.' })
  }

  const sql = getDb()
  const rows = await sql`
    UPDATE users
    SET display_name = ${name}, avatar_color = ${avatarColor}, updated_at = NOW()
    WHERE user_id = ${req.userId}
    RETURNING user_id, display_name, email, avatar_color
  `
  if (!rows.length) return res.status(404).json({ message: 'User not found.' })

  res.json({
    user: {
      id: rows[0].user_id,
      name: rows[0].display_name,
      email: rows[0].email,
      avatarColor: rows[0].avatar_color,
    },
  })
}

// The colours the profile form offers, so the page and the check above agree.
export { AVATAR_COLORS }
