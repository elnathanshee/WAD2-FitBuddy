// Handlers for /api/friends (the Friends page and a friend's profile). All need a logged-in user.
// Find athletes, send / accept / reject / cancel friend requests, remove
// friends, and view a friend's profile and weekly progress. A friendship is one
// row in `friendships` per pair of people; rejecting, cancelling and removing
// delete the row so the two can start again later. Emails are never returned.

import { getDb } from '../config/neon.js'
import { toDateKey, isValidDateKey } from '../utils/dates.js'
import { buildAnalytics } from '../utils/analytics.js'
import { relationFor, normaliseSearch } from '../utils/friends.js'
import { loadUserData } from './analyticsController.js'
import { weeklyBreakdown } from './neonLeaderboardController.js'

// True when the :id in the URL is a whole number
function isRequestId(value) {
  return Number.isInteger(Number(value))
}

// The row between two people, whichever of them sent the request (or undefined)
// Also used by challengeController for its friends-only check
export async function findPair(a, b) {
  const sql = getDb()
  const rows = await sql`
    SELECT id, requester_id, addressee_id, status, created_at, responded_at
    FROM friendships
    WHERE (requester_id = ${a} AND addressee_id = ${b})
       OR (requester_id = ${b} AND addressee_id = ${a})
  `
  return rows[0]
}

// One user's public details (never the email), or undefined
async function findUser(userId) {
  const sql = getDb()
  const rows = await sql`
    SELECT user_id, display_name, avatar_color, created_at FROM users WHERE user_id = ${userId}
  `
  return rows[0]
}

// GET /api/friends
// Responds 200 { friends, incoming, outgoing }: each a list of { requestId, userId, displayName,
// avatarColor, since } for people I am friends with, who asked me, and whom I asked.
export async function listFriends(req, res) {
  const sql = getDb()
  const me = req.userId

  // Every row I'm part of, joined to the person on the other side
  const rows = await sql`
    SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at, f.responded_at,
           u.user_id, u.display_name, u.avatar_color
    FROM friendships f
    JOIN users u ON u.user_id = CASE WHEN f.requester_id = ${me} THEN f.addressee_id ELSE f.requester_id END
    WHERE f.requester_id = ${me} OR f.addressee_id = ${me}
    ORDER BY u.display_name
  `

  // relationFor gives 'friends', 'incoming' or 'outgoing' for every row here
  const result = { friends: [], incoming: [], outgoing: [] }
  for (const row of rows) {
    const relation = relationFor(row, me)
    result[relation].push({
      requestId: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      since: relation === 'friends' ? row.responded_at : row.created_at,
    })
  }
  res.json(result)
}

// GET /api/friends/search?q=
// Finds athletes by part of a name or a whole email address (q must be 2+ characters, else 400).
// Responds 200 { results: [{ userId, displayName, avatarColor, relation, requestId }] }, at most 10.
export async function searchUsers(req, res) {
  const sql = getDb()
  const me = req.userId
  const search = normaliseSearch(req.query.q)
  if (!search) {
    return res.status(400).json({ message: 'Type at least 2 characters to search.' })
  }

  // Matches part of a name, or a whole email address (emails are never sent back)
  const rows = await sql`
    SELECT u.user_id, u.display_name, u.avatar_color, f.id AS request_id,
           f.requester_id, f.addressee_id, f.status
    FROM users u
    LEFT JOIN friendships f
      ON (f.requester_id = ${me} AND f.addressee_id = u.user_id)
      OR (f.addressee_id = ${me} AND f.requester_id = u.user_id)
    WHERE u.user_id <> ${me}
      AND (u.display_name ILIKE ${search.pattern} OR LOWER(u.email) = LOWER(${search.text}))
    ORDER BY u.display_name
    LIMIT 10
  `

  res.json({
    results: rows.map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      relation: relationFor(row.request_id ? row : null, me),
      requestId: row.request_id ?? null,
    })),
  })
}

// POST /api/friends/requests  { userId }
// Sends a friend request (or accepts it, if that person already asked me).
// Responds 201 { relation: 'outgoing', requestId, message }, or 200 { relation: 'friends', ... } when accepted.
// Errors: 400 missing id or yourself, 404 no such athlete, 409 already friends or already asked.
export async function sendRequest(req, res) {
  const sql = getDb()
  const me = req.userId
  const { userId } = req.body ?? {}

  if (typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({ message: 'userId is required' })
  }
  if (userId === me) {
    return res.status(400).json({ message: "You can't add yourself." })
  }
  const other = await findUser(userId)
  if (!other) {
    return res.status(404).json({ message: 'Athlete not found' })
  }

  const name = other.display_name
  const existing = await findPair(me, userId)
  if (existing) {
    const relation = relationFor(existing, me)
    if (relation === 'friends') {
      return res.status(409).json({ message: `You're already friends with ${name}.` })
    }
    if (relation === 'outgoing') {
      return res.status(409).json({ message: `Friend request already sent to ${name}.` })
    }
    // They already asked me, so sending a request back just accepts theirs
    await sql`
      UPDATE friendships SET status = 'accepted', responded_at = NOW()
      WHERE id = ${existing.id} AND status = 'pending'
    `
    return res.json({
      relation: 'friends',
      requestId: existing.id,
      message: `${name} had already asked — you're now friends!`,
    })
  }

  // The unique pair index stops a double-click or a simultaneous request
  const inserted = await sql`
    INSERT INTO friendships (requester_id, addressee_id)
    VALUES (${me}, ${userId})
    ON CONFLICT DO NOTHING
    RETURNING id
  `
  if (inserted.length === 0) {
    return res.status(409).json({ message: `Friend request already sent to ${name}.` })
  }
  res.status(201).json({
    relation: 'outgoing',
    requestId: inserted[0].id,
    message: `Friend request sent to ${name}.`,
  })
}

// POST /api/friends/requests/:id/accept
// Only the person who was asked can accept. Responds 200 { relation: 'friends', message }; 404 if no such pending request.
export async function acceptRequest(req, res) {
  const sql = getDb()
  if (!isRequestId(req.params.id)) {
    return res.status(404).json({ message: 'Friend request not found' })
  }

  const rows = await sql`
    UPDATE friendships SET status = 'accepted', responded_at = NOW()
    WHERE id = ${Number(req.params.id)} AND addressee_id = ${req.userId} AND status = 'pending'
    RETURNING requester_id
  `
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Friend request not found' })
  }
  const requester = await findUser(rows[0].requester_id)
  res.json({ relation: 'friends', message: `You and ${requester?.display_name ?? 'them'} are now friends.` })
}

// POST /api/friends/requests/:id/reject
// Only the person who was asked can decline (the row is deleted). Responds 200 { relation: 'none', message }; 404 if none.
export async function rejectRequest(req, res) {
  const sql = getDb()
  if (!isRequestId(req.params.id)) {
    return res.status(404).json({ message: 'Friend request not found' })
  }

  const rows = await sql`
    DELETE FROM friendships
    WHERE id = ${Number(req.params.id)} AND addressee_id = ${req.userId} AND status = 'pending'
    RETURNING id
  `
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Friend request not found' })
  }
  res.json({ relation: 'none', message: 'Friend request declined.' })
}

// DELETE /api/friends/requests/:id
// Only the sender can cancel a request that is still pending. Responds 200 { relation: 'none', message }; 404 if none.
export async function cancelRequest(req, res) {
  const sql = getDb()
  if (!isRequestId(req.params.id)) {
    return res.status(404).json({ message: 'Friend request not found' })
  }

  const rows = await sql`
    DELETE FROM friendships
    WHERE id = ${Number(req.params.id)} AND requester_id = ${req.userId} AND status = 'pending'
    RETURNING id
  `
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Friend request not found' })
  }
  res.json({ relation: 'none', message: 'Friend request cancelled.' })
}

// DELETE /api/friends/:userId
// Removes an accepted friendship. Responds 200 { relation: 'none', message }; 404 if you are not friends.
export async function removeFriend(req, res) {
  const sql = getDb()
  const me = req.userId
  const them = req.params.userId

  const rows = await sql`
    DELETE FROM friendships
    WHERE status = 'accepted'
      AND ((requester_id = ${me} AND addressee_id = ${them})
        OR (requester_id = ${them} AND addressee_id = ${me}))
    RETURNING id
  `
  if (rows.length === 0) {
    return res.status(404).json({ message: "You're not friends with this athlete." })
  }
  res.json({ relation: 'none', message: 'Friend removed.' })
}

// GET /api/friends/:userId/profile?today=YYYY-MM-DD
// A friend's (or your own) profile with this week's points and habit analytics.
// Responds 200 { profile, points, analytics }. Errors: 400 bad date, 404 no such athlete, 403 not friends.
export async function friendProfile(req, res) {
  const sql = getDb()
  const me = req.userId
  const them = req.params.userId
  const { today = toDateKey() } = req.query
  if (!isValidDateKey(today)) {
    return res.status(400).json({ message: 'today must be a real day in YYYY-MM-DD format' })
  }

  const user = await findUser(them)
  if (!user) {
    return res.status(404).json({ message: 'Athlete not found' })
  }

  // Only friends can see each other's progress (your own profile is fine too)
  const friendship = them === me ? null : await findPair(me, them)
  if (them !== me && relationFor(friendship, me) !== 'friends') {
    return res.status(403).json({ message: 'You can only view the profiles of your friends.' })
  }

  const [counts, data, points] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE status = 'accepted' AND (requester_id = ${them} OR addressee_id = ${them})
    `,
    loadUserData(them),
    weeklyBreakdown(them, today),
  ])

  res.json({
    profile: {
      userId: user.user_id,
      displayName: user.display_name,
      avatarColor: user.avatar_color,
      memberSince: user.created_at,
      friendsSince: friendship?.responded_at ?? null,
      friendsCount: counts[0].count,
    },
    points,
    analytics: buildAnalytics(data.habits, data.checkIns, { period: 'week', today }),
  })
}
