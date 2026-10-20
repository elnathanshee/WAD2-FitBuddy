// =============================================================================
// [IS216 Project Addition: Challenge & Duels Controller with Neon PostgreSQL]
// Technology: Express.js + Neon PostgreSQL
//
// Allows athletes to challenge rivals on the leaderboard to head-to-head habit sprints.
// =============================================================================

import { getDb } from '../config/neon.js'

/**
 * GET /api/challenges
 * Returns all active and completed challenges for the authenticated user.
 */
export async function listChallenges(req, res) {
  const sql = getDb()
  const userId = req.userId

  const rows = await sql`
    SELECT 
      c.id,
      c.creator_id,
      c.opponent_id,
      c.title,
      c.habit_category,
      c.target_days,
      c.creator_progress,
      c.opponent_progress,
      c.status,
      c.winner_id,
      c.created_at,
      u1.display_name AS creator_name,
      u1.avatar_color AS creator_color,
      u2.display_name AS opponent_name,
      u2.avatar_color AS opponent_color
    FROM challenges c
    LEFT JOIN users u1 ON c.creator_id = u1.user_id
    LEFT JOIN users u2 ON c.opponent_id = u2.user_id
    WHERE c.creator_id = ${userId} OR c.opponent_id = ${userId}
    ORDER BY c.created_at DESC
    LIMIT 20
  `

  res.json({ challenges: rows })
}

/**
 * POST /api/challenges
 * Body: { opponentId, title, habitCategory, targetDays }
 */
export async function createChallenge(req, res) {
  const { opponentId, title, habitCategory = 'exercise', targetDays = 7 } = req.body || {}

  if (!opponentId) {
    return res.status(400).json({ message: 'opponentId is required.' })
  }
  if (String(opponentId) === String(req.userId)) {
    return res.status(400).json({ message: 'You cannot challenge yourself!' })
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ message: 'Challenge title is required.' })
  }

  const cleanTitle = title.trim().slice(0, 100)
  const days = Number(targetDays) > 0 ? Number(targetDays) : 7
  const sql = getDb()

  const inserted = await sql`
    INSERT INTO challenges (creator_id, opponent_id, title, habit_category, target_days, creator_progress, opponent_progress, status)
    VALUES (${req.userId}, ${opponentId}, ${cleanTitle}, ${habitCategory}, ${days}, 0, 0, 'active')
    RETURNING id, creator_id, opponent_id, title, habit_category, target_days, creator_progress, opponent_progress, status, created_at
  `

  res.status(201).json({
    message: 'Challenge created successfully!',
    challenge: inserted[0],
  })
}

/**
 * POST /api/challenges/:id/progress
 * Advances progress for the current user in this challenge.
 */
export async function recordChallengeProgress(req, res) {
  const { id } = req.params
  const sql = getDb()

  const rows = await sql`
    SELECT * FROM challenges WHERE id = ${id} LIMIT 1
  `
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Challenge not found.' })
  }

  const ch = rows[0]
  if (ch.status === 'completed') {
    return res.status(400).json({ message: 'Challenge is already completed!' })
  }

  const isCreator = String(ch.creator_id) === String(req.userId)
  const isOpponent = String(ch.opponent_id) === String(req.userId)

  if (!isCreator && !isOpponent) {
    return res.status(403).json({ message: 'You are not a participant in this challenge.' })
  }

  const newCreatorProgress = isCreator ? ch.creator_progress + 1 : ch.creator_progress
  const newOpponentProgress = isOpponent ? ch.opponent_progress + 1 : ch.opponent_progress

  let status = 'active'
  let winnerId = null

  if (newCreatorProgress >= ch.target_days) {
    status = 'completed'
    winnerId = ch.creator_id
  } else if (newOpponentProgress >= ch.target_days) {
    status = 'completed'
    winnerId = ch.opponent_id
  }

  const updated = await sql`
    UPDATE challenges
    SET 
      creator_progress = ${newCreatorProgress},
      opponent_progress = ${newOpponentProgress},
      status = ${status},
      winner_id = ${winnerId},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  res.json({
    message: status === 'completed' ? 'Challenge completed!' : 'Progress recorded!',
    challenge: updated[0],
  })
}

