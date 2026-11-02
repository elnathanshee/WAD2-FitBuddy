// Handlers for /api/challenges (the Challenges section on the Dashboard). All need a logged-in user.
// Lets athletes challenge their accepted friends to head-to-head habit sprints.
//
// Lifecycle (status strings, no schema change):
//   created -> 'pending'; the opponent accepts -> 'active' or declines -> 'declined'
//   'active' -> 'completed' once someone reaches target_days.
// The creator can delete a challenge only while it is 'pending' (cancel) or
// 'declined' (dismiss). The opponent no longer sees a challenge they declined.
// The who-can-do-what rules live in utils/challenges.js.

import { getDb } from '../config/neon.js'
import { findPair } from './friendController.js'
import { relationFor } from '../utils/friends.js'
import { canRespond, canDelete, canLogProgress, roleIn, visibleTo } from '../utils/challenges.js'
import { sendChallengeNotification } from '../services/notificationService.js'

/**
 * GET /api/challenges
 * Responds 200 { challenges: [...] }: the user's newest 20 challenges (pending, active, completed;
 * not ones they declined), each with both athletes' names and colours.
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

// Sends the push notification for a new challenge. Never blocks or fails the request.
async function notifyOpponent(sql, creatorId, opponentId, title, targetDays) {
  try {
    const [creator] = await sql`SELECT display_name FROM users WHERE user_id = ${creatorId}`
    sendChallengeNotification(opponentId, {
      creatorName: creator?.display_name || 'An athlete',
      title,
      targetDays,
    }).catch((err) => console.warn('[OneSignal Challenge Notification Warning]', err?.message))
  } catch (notifyErr) {
    // Non-blocking
  }
}

/**
 * POST /api/challenges
 * Body: { opponentId, title, habitCategory = 'exercise', targetDays = 7 }
 * Creates a 'pending' challenge against an accepted friend.
 * Responds 201 { message, challenge }. Errors: 400 missing/invalid fields, 403 opponent is not a friend.
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

  // Tell the opponent by push notification
  await notifyOpponent(sql, req.userId, opponentId, cleanTitle, days)

  res.status(201).json({
    message: 'Challenge sent! Waiting for your friend to accept.',
    challenge: inserted[0],
  })
}

// Works out the challenge status after one more day is logged: the first athlete to reach
// target_days wins and the challenge is 'completed'.
function statusAfterProgress(ch, newCreatorProgress, newOpponentProgress) {
  if (newCreatorProgress >= ch.target_days) {
    return { status: 'completed', winnerId: ch.creator_id }
  }
  if (newOpponentProgress >= ch.target_days) {
    return { status: 'completed', winnerId: ch.opponent_id }
  }
  return { status: 'active', winnerId: null }
}

/**
 * POST /api/challenges/:id/progress
 * Adds one day of progress for the logged-in athlete in an active challenge.
 * Responds 200 { message, challenge }. Errors: 404 not found, 403 not a participant,
 * 400 already completed or not accepted yet.
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
    let message = "This challenge hasn't been accepted yet."
    if (ch.status === 'completed') message = 'Challenge is already completed!'
    return res.status(400).json({ message })
  }

  let newCreatorProgress = ch.creator_progress
  let newOpponentProgress = ch.opponent_progress
  if (role === 'creator') newCreatorProgress += 1
  if (role === 'opponent') newOpponentProgress += 1

  const { status, winnerId } = statusAfterProgress(ch, newCreatorProgress, newOpponentProgress)

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

// Shared by accept and decline: only the invited opponent, only while pending.
// Errors: 404 not found, 403 not the invited friend, 409 already answered.
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

/** POST /api/challenges/:id/accept - responds 200 { message, challenge } with status 'active' */
export function acceptChallenge(req, res) {
  return respond(req, res, 'active', 'Challenge accepted. Game on!')
}

/** POST /api/challenges/:id/decline - responds 200 { message, challenge } with status 'declined' */
export function declineChallenge(req, res) {
  return respond(req, res, 'declined', 'Challenge declined.')
}

/**
 * DELETE /api/challenges/:id
 * The creator cancels a pending challenge or dismisses a declined one.
 * Responds 200 { message }. Errors: 404 not found, 403 not the creator, 409 challenge already active/completed.
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
  const message = ch.status === 'pending' ? 'Challenge cancelled.' : 'Challenge dismissed.'
  res.json({ message })
}
