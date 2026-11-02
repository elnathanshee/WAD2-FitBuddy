// Handlers for /api/auth: sign up, log in, who am I, demo accounts, profile and fitness goal.
// Passwords are hashed and login tokens created by utils/auth.js.
// Public routes: signup, login, demo-users. The rest need a logged-in user (req.userId).

import { getDb } from '../config/neon.js'
import { hashPassword, verifyPassword, createToken } from '../utils/auth.js'

// The avatar colours a user can have (the profile form offers the same list)
const AVATAR_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EC4899',
  '#8B5CF6', '#06B6D4', '#EF4444', '#14B8A6',
]

// The fitness goals a user can choose
const ALLOWED_GOALS = ['wellness', 'weight-loss', 'muscle-gain', 'cardio', 'strength', 'mobility', 'sleep']

// The free-text "goal target" (e.g. "run 5km"): trimmed and at most 80 characters, '' if not a string
function cleanGoalTarget(value) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 80)
}

// The user shape sent to the frontend (never includes the password hash)
function userToJson(row) {
  return {
    id: row.user_id,
    name: row.display_name,
    email: row.email,
    avatarColor: row.avatar_color,
  }
}

/**
 * POST /api/auth/signup
 * Body: { name, email, password, primaryGoal?, goalTarget? }
 * Creates the account plus three starter habits for the chosen goal.
 * Responds 201 { message, token, user }. Errors: 400 invalid fields, 409 email already used.
 */
export async function signup(req, res) {
  const { name, email, password } = req.body || {}
  const primaryGoal = ALLOWED_GOALS.includes(req.body?.primaryGoal) ? req.body.primaryGoal : 'wellness'
  const goalTarget = cleanGoalTarget(req.body?.goalTarget)

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
    user: userToJson(newUser),
  })
}

// The three starter habits a new account gets, depending on the goal they picked.
// Each line is [name, category, target amount, unit, icon].
function getGoalHabits(goal) {
  const habitsByGoal = {
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
  return habitsByGoal[goal].map(([name, category, targetAmount, targetUnit, icon]) => ({ name, category, frequency: 'daily', targetAmount, targetUnit, icon }))
}

/**
 * GET /api/auth/goal
 * Responds 200 { goal: { primaryGoal, goalTarget, updatedAt } }. Error: 404 user not found.
 */
export async function getGoal(req, res) {
  const sql = getDb()
  const rows = await sql`SELECT primary_goal, goal_target, goal_updated_at FROM users WHERE user_id = ${req.userId} LIMIT 1`
  if (!rows.length) return res.status(404).json({ message: 'User not found.' })
  res.json({ goal: { primaryGoal: rows[0].primary_goal || 'wellness', goalTarget: rows[0].goal_target || '', updatedAt: rows[0].goal_updated_at } })
}

/**
 * PUT /api/auth/goal
 * Body: { primaryGoal (one of the allowed goals), goalTarget? }
 * Responds 200 { goal }. Errors: 400 invalid goal, 404 user not found.
 */
export async function updateGoal(req, res) {
  const primaryGoal = req.body?.primaryGoal
  if (!ALLOWED_GOALS.includes(primaryGoal)) return res.status(400).json({ message: 'Choose a valid goal.' })
  const goalTarget = cleanGoalTarget(req.body?.goalTarget)
  const sql = getDb()
  const rows = await sql`UPDATE users SET primary_goal = ${primaryGoal}, goal_target = ${goalTarget || null}, goal_updated_at = NOW(), updated_at = NOW() WHERE user_id = ${req.userId} RETURNING primary_goal, goal_target, goal_updated_at`
  if (!rows.length) return res.status(404).json({ message: 'User not found.' })
  res.json({ goal: { primaryGoal: rows[0].primary_goal, goalTarget: rows[0].goal_target || '', updatedAt: rows[0].goal_updated_at } })
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Responds 200 { message, token, user }. Errors: 400 missing fields, 401 wrong email or password.
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
    user: userToJson(user),
  })
}

/**
 * GET /api/auth/me
 * Needs a logged-in user. Responds 200 { user }. Error: 404 user not found.
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

  res.json({ user: userToJson(rows[0]) })
}

/**
 * GET /api/auth/demo-users
 * Public. Responds 200 { demoAccounts: [{ id, name, email, avatarColor }] } (the 8 oldest accounts,
 * used by the demo-athlete switcher).
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

  const demoAccounts = rows.map(userToJson)

  res.json({ demoAccounts })
}

/**
 * PUT /api/auth/profile
 * Body: { name, avatarColor }
 *
 * Lets a signed-in user rename themselves and pick an avatar colour. Only those
 * two fields can be changed here - the email and the password hash are never
 * read from the body, so a request cannot overwrite them.
 * Responds 200 { user }. Errors: 400 invalid name or colour, 404 user not found.
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

  res.json({ user: userToJson(rows[0]) })
}
