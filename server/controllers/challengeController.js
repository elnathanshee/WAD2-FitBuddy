// =============================================================================
// [IS216 Project Addition: Challenge & Duels Controller with Neon PostgreSQL]
// Technology: Express.js + Neon PostgreSQL
//
// Lets athletes challenge their accepted friends to head-to-head habit sprints.
//
// Lifecycle (status strings, no schema change):
//   created -> 'pending'; the opponent accepts -> 'active' or declines -> 'declined'
//   'active' -> 'completed' once someone reaches target_days.
// The creator can delete a challenge only while it is 'pending' (cancel) or
// 'declined' (dismiss). The opponent no longer sees a challenge they declined.
// =============================================================================

import { getDb } from '../config/neon.js'
import { findPair } from './friendController.js'
import { relationFor } from '../utils/friends.js'
import { canRespond, canDelete, canLogProgress, roleIn, visibleTo } from '../utils/challenges.js'

/**
 * GET /api/challenges
 * Returns the user's challenges (pending, active, completed; not ones they declined).
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
      c.updated_at,
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

  // Hide challenges the user declined (the creator still sees them as declined)
  res.json({ challenges: rows.filter((ch) => visibleTo(ch, userId)) })
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

  // Challenges are only allowed between accepted friends
  const pair = await findPair(req.userId, opponentId)
  if (relationFor(pair, req.userId) !== 'friends') {
    return res.status(403).json({ message: 'You can only challenge your friends.' })
  }

  const cleanTitle = title.trim().slice(0, 100)
  const days = Number(targetDays) > 0 ? Number(targetDays) : 7
  const sql = getDb()

  // New challenges start 'pending' until the invited friend accepts
  const inserted = await sql`
    INSERT INTO challenges (creator_id, opponent_id, title, habit_category, target_days, creator_progress, opponent_progress, status)
    VALUES (${req.userId}, ${opponentId}, ${cleanTitle}, ${habitCategory}, ${days}, 0, 0, 'pending')
    RETURNING id, creator_id, opponent_id, title, habit_category, target_days, creator_progress, opponent_progress, status, created_at
  `

  res.status(201).json({
    message: 'Challenge sent! Waiting for your friend to accept.',
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
  // Only participants can log progress, and only once the challenge is accepted
  const role = roleIn(ch, req.userId)
  if (!role) {
    return res.status(403).json({ message: 'You are not a participant in this challenge.' })
  }
  if (!canLogProgress(ch, req.userId)) {
    const message =
      ch.status === 'completed'
        ? 'Challenge is already completed!'
        : "This challenge hasn't been accepted yet."
    return res.status(400).json({ message })
  }

  const isCreator = role === 'creator'
  const isOpponent = role === 'opponent'

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


// Shared by accept and decline: only the invited opponent, only while pending
async function respond(req, res, newStatus, message) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM challenges WHERE id = ${req.params.id} LIMIT 1`
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Challenge not found.' })
  }

  const ch = rows[0]
  if (roleIn(ch, req.userId) !== 'opponent') {
    return res.status(403).json({ message: 'Only the invited friend can respond to this challenge.' })
  }
  if (!canRespond(ch, req.userId)) {
    return res.status(409).json({ message: 'This challenge has already been answered.' })
  }

  const updated = await sql`
    UPDATE challenges
    SET status = ${newStatus}, updated_at = NOW()
    WHERE id = ${ch.id}
    RETURNING *
  `
  res.json({ message, challenge: updated[0] })
}

/** POST /api/challenges/:id/accept */
export function acceptChallenge(req, res) {
  return respond(req, res, 'active', 'Challenge accepted. Game on!')
}

/** POST /api/challenges/:id/decline */
export function declineChallenge(req, res) {
  return respond(req, res, 'declined', 'Challenge declined.')
}

/**
 * DELETE /api/challenges/:id
 * The creator cancels a pending challenge or dismisses a declined one.
 */
export async function deleteChallenge(req, res) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM challenges WHERE id = ${req.params.id} LIMIT 1`
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Challenge not found.' })
  }

  const ch = rows[0]
  if (roleIn(ch, req.userId) !== 'creator') {
    return res.status(403).json({ message: 'Only the creator can remove this challenge.' })
  }
  if (!canDelete(ch, req.userId)) {
    return res.status(409).json({ message: 'Only pending or declined challenges can be removed.' })
  }

  await sql`DELETE FROM challenges WHERE id = ${ch.id}`
  res.json({ message: ch.status === 'pending' ? 'Challenge cancelled.' : 'Challenge dismissed.' })
}
