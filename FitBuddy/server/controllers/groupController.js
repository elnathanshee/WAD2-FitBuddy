// Handlers for /api/groups (the Groups page): habit groups, group activities, group check-ins
// and encouragement. Every route needs a logged-in user (app.js adds requireUser), so req.userId is set.
// "Today" always means the Singapore calendar day, worked out inside the SQL.
import { getDb } from '../config/neon.js'

// True only for a real calendar day written as YYYY-MM-DD (rejects '2026-02-31')
function validDate(value) {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  if (Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return false
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}

// Keeps only non-empty strings, without duplicates. Used for lists of user ids in a request body.
function uniqueIds(list) {
  if (!Array.isArray(list)) return []
  return [...new Set(list.filter((id) => typeof id === 'string' && id))]
}

// True if the user belongs to the group
async function requireMember(sql, groupId, userId) {
  const rows = await sql`SELECT 1 FROM habit_group_members WHERE group_id = ${groupId} AND user_id = ${userId}`
  return rows.length > 0
}

// ---- GET /api/groups ------------------------------------------------------

// Turns the member rows into a Map of groupId -> group (activities and leaderboard are filled in later)
function groupsFromMemberRows(rows) {
  const groups = new Map()
  for (const row of rows) {
    if (!groups.has(row.id)) {
      groups.set(row.id, { id: row.id, name: row.name, ownerId: row.owner_id, members: [], activities: [], leaderboard: [] })
    }
    groups.get(row.id).members.push({ userId: row.member_id, displayName: row.display_name, avatarColor: row.avatar_color })
  }
  return groups
}

// The activity query returns one row per participant, so rows are merged into one object per activity
function activitiesFromRows(activityRows) {
  const activityById = new Map()
  for (const row of activityRows) {
    if (!activityById.has(row.id)) {
      activityById.set(row.id, {
        id: row.id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        points: row.points,
        createdBy: row.created_by,
        checkedInToday: row.checked_in_today,
        checkedInCount: row.checked_in_count,
        cheerCount: row.cheer_count,
        cheeredToday: row.cheered_today,
        participants: [],
      })
    }
    if (row.participant_id) {
      activityById.get(row.id).participants.push({
        userId: row.participant_id,
        displayName: row.participant_name,
        avatarColor: row.participant_color,
      })
    }
  }
  return [...activityById.values()]
}

// Ranks members by points; members with equal points share the same rank
function leaderboardFromScores(scores, currentUserId) {
  let rank = 0
  let previousPoints = null
  return scores.map((entry, index) => {
    if (entry.points !== previousPoints) {
      rank = index + 1
      previousPoints = entry.points
    }
    return {
      userId: entry.user_id,
      displayName: entry.display_name,
      avatarColor: entry.avatar_color,
      points: entry.points,
      activities: entry.activities,
      rank,
      isCurrentUser: entry.user_id === currentUserId,
    }
  })
}

/**
 * GET /api/groups
 * Responds 200 { groups: [{ id, name, ownerId, members, activities, leaderboard }] } for every group
 * the logged-in user belongs to.
 */
export async function listGroups(req, res) {
  const sql = getDb()
  const rows = await sql`
    SELECT g.id, g.name, g.owner_id, gm.user_id AS member_id, u.display_name, u.avatar_color
    FROM habit_groups g
    JOIN habit_group_members mine ON mine.group_id = g.id AND mine.user_id = ${req.userId}
    JOIN habit_group_members gm ON gm.group_id = g.id
    JOIN users u ON u.user_id = gm.user_id
    ORDER BY g.id, u.display_name
  `
  const groups = groupsFromMemberRows(rows)
  for (const group of groups.values()) {
    const [activityRows, scores] = await Promise.all([
      sql`SELECT a.id, a.title, a.start_date::text, a.end_date::text, a.points,
        a.created_by,
        EXISTS(SELECT 1 FROM group_checkins c WHERE c.activity_id = a.id AND c.user_id = ${req.userId} AND c.checkin_date = (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS checked_in_today,
        (SELECT COUNT(*)::int FROM group_checkins c WHERE c.activity_id = a.id AND c.checkin_date = (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS checked_in_count,
        (SELECT COUNT(*)::int FROM group_activity_cheers ch WHERE ch.activity_id = a.id AND ch.cheer_date = (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS cheer_count,
        EXISTS(SELECT 1 FROM group_activity_cheers ch WHERE ch.activity_id = a.id AND ch.from_user_id = ${req.userId} AND ch.cheer_date = (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS cheered_today,
        am.user_id AS participant_id, pu.display_name AS participant_name, pu.avatar_color AS participant_color
        FROM group_activities a
        LEFT JOIN group_activity_members am ON am.activity_id = a.id
        LEFT JOIN users pu ON pu.user_id = am.user_id
        WHERE a.group_id = ${group.id} ORDER BY a.end_date DESC, a.id DESC, pu.display_name`,
      sql`SELECT m.user_id, u.display_name, u.avatar_color, COALESCE(SUM(c.points), 0)::int AS points,
        COUNT(DISTINCT c.activity_id)::int AS activities
        FROM habit_group_members m JOIN users u ON u.user_id = m.user_id
        LEFT JOIN group_checkins c ON c.group_id = m.group_id AND c.user_id = m.user_id
        WHERE m.group_id = ${group.id} GROUP BY m.user_id, u.display_name, u.avatar_color
        ORDER BY points DESC, u.display_name`,
    ])
    group.activities = activitiesFromRows(activityRows)
    group.leaderboard = leaderboardFromScores(scores, req.userId)
  }
  res.json({ groups: [...groups.values()] })
}

// ---- POST /api/groups -----------------------------------------------------

/**
 * POST /api/groups
 * Body: { name (1-60 chars), memberIds: [1-19 friend user ids] }. The creator is added automatically.
 * Responds 201 { groupId, message }. Errors: 400 bad name or member count, 403 a member is not an accepted friend.
 */
export async function createGroup(req, res) {
  const sql = getDb()
  const name = String(req.body?.name ?? '').trim()
  const memberIds = uniqueIds(req.body?.memberIds).filter((id) => id !== req.userId)
  if (!name || name.length > 60) return res.status(400).json({ message: 'Group name must be 1–60 characters.' })
  if (memberIds.length < 1 || memberIds.length > 19) return res.status(400).json({ message: 'Choose 1–19 friends to start your group.' })
  const friends = await sql`SELECT CASE WHEN requester_id = ${req.userId} THEN addressee_id ELSE requester_id END AS user_id FROM friendships WHERE status = 'accepted' AND (requester_id = ${req.userId} OR addressee_id = ${req.userId})`
  const friendIds = new Set(friends.map((row) => row.user_id))
  if (memberIds.some((id) => !friendIds.has(id))) return res.status(403).json({ message: 'Groups can only include your accepted friends.' })
  const rows = await sql`INSERT INTO habit_groups (name, owner_id) VALUES (${name}, ${req.userId}) RETURNING id`
  const groupId = rows[0].id
  for (const userId of [req.userId, ...memberIds]) {
    await sql`INSERT INTO habit_group_members (group_id, user_id) VALUES (${groupId}, ${userId}) ON CONFLICT DO NOTHING`
  }
  res.status(201).json({ groupId, message: 'Habit group created.' })
}

// ---- POST /api/groups/:groupId/activities ----------------------------------

// True when the activity form fields are all valid
function isValidActivityInput(title, startDate, endDate, points) {
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 80) return false
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) return false
  return Number.isInteger(points) && points >= 1 && points <= 1000
}

/**
 * POST /api/groups/:groupId/activities
 * Body: { title (1-80), startDate, endDate (YYYY-MM-DD), points (1-1000 per check-in), memberIds? }.
 * memberIds are the participants (all group members when left out).
 * Responds 201 { activityId, message }. Errors: 404 not in this group, 400 invalid input or participants.
 */
export async function createActivity(req, res) {
  const sql = getDb()
  const groupId = Number(req.params.groupId)
  const { title, startDate, endDate } = req.body ?? {}
  const points = Number(req.body?.points)
  if (!Number.isInteger(groupId) || !(await requireMember(sql, groupId, req.userId))) return res.status(404).json({ message: 'Habit group not found.' })
  if (!isValidActivityInput(title, startDate, endDate, points)) {
    return res.status(400).json({ message: 'Add an activity name, valid dates, and 1–1000 points per check-in.' })
  }
  const groupMembers = await sql`SELECT user_id FROM habit_group_members WHERE group_id = ${groupId}`
  const groupMemberIds = new Set(groupMembers.map((member) => member.user_id))
  const requestedParticipants = Array.isArray(req.body?.memberIds)
    ? uniqueIds(req.body.memberIds)
    : [...groupMemberIds]
  if (requestedParticipants.length < 1 || requestedParticipants.length > 20 || requestedParticipants.some((id) => !groupMemberIds.has(id))) {
    return res.status(400).json({ message: 'Choose at least one participant from this group.' })
  }
  const rows = await sql`INSERT INTO group_activities (group_id, title, start_date, end_date, points, created_by) VALUES (${groupId}, ${title.trim()}, ${startDate}, ${endDate}, ${points}, ${req.userId}) RETURNING id`
  for (const userId of requestedParticipants) {
    await sql`INSERT INTO group_activity_members (activity_id, user_id) VALUES (${rows[0].id}, ${userId}) ON CONFLICT DO NOTHING`
  }
  res.status(201).json({ activityId: rows[0].id, message: 'Group activity created.' })
}

// ---- POST /api/groups/activities/:activityId/check-in ------------------------

/**
 * POST /api/groups/activities/:activityId/check-in
 * Body: { userIds: [up to 20 participant ids, including yourself] }. Checks them in for today (Singapore).
 * Responds 200 { added, message } (added = how many were newly checked in).
 * Errors: 404 activity not found, 400 outside the dates or bad list, 403 someone is not a participant.
 */
export async function checkIn(req, res) {
  const sql = getDb()
  const activityId = Number(req.params.activityId)
  // The dates are cast to text (like listGroups does), so they come back as
  // 'YYYY-MM-DD' strings. Without the cast the driver returns Date objects, and
  // String(date).slice(0, 10) gives 'Mon Nov 0' instead of '2026-11-02', which
  // made the date check below reject every activity.
  const activityRows = await sql`
    SELECT a.id, a.group_id, a.points,
      a.start_date::text AS start_date,
      a.end_date::text AS end_date,
      (NOW() AT TIME ZONE 'Asia/Singapore')::date::text AS today
    FROM group_activities a WHERE a.id = ${activityId}`
  const activity = activityRows[0]
  if (!activity || !(await requireMember(sql, activity.group_id, req.userId))) return res.status(404).json({ message: 'Group activity not found.' })
  // 'YYYY-MM-DD' strings compare correctly with < and >, so no date maths needed
  if (activity.today < activity.start_date || activity.today > activity.end_date) return res.status(400).json({ message: 'This activity is outside its check-in dates.' })
  const selected = [...new Set(Array.isArray(req.body?.userIds) ? req.body.userIds.filter((id) => typeof id === 'string') : [])]
  if (!selected.includes(req.userId) || selected.length > 20) return res.status(400).json({ message: 'Include yourself and select up to 20 activity participants.' })
  const members = await sql`SELECT user_id FROM group_activity_members WHERE activity_id = ${activity.id}`
  const memberIds = new Set(members.map((member) => member.user_id))
  if (!memberIds.has(req.userId) || selected.some((id) => !memberIds.has(id))) return res.status(403).json({ message: 'Only selected activity participants can check in.' })
  let added = 0
  for (const userId of selected) {
    const inserted = await sql`INSERT INTO group_checkins (activity_id, group_id, user_id, checkin_date, points)
      VALUES (${activity.id}, ${activity.group_id}, ${userId}, (NOW() AT TIME ZONE 'Asia/Singapore')::date, ${activity.points})
      ON CONFLICT (activity_id, user_id, checkin_date) DO NOTHING RETURNING id`
    added += inserted.length
  }
  res.json({ added, message: checkInMessage(added, activity.points) })
}

// The sentence shown after a group check-in
function checkInMessage(added, points) {
  if (added === 0) return 'Those members already checked in today.'
  const noun = added === 1 ? 'member' : 'members'
  return `Checked in ${added} ${noun} for ${points} points each.`
}

// ---- DELETE /api/groups/:groupId/activities/:activityId -----------------------

/**
 * DELETE /api/groups/:groupId/activities/:activityId
 * Only the activity's creator or the group owner may delete it (its check-ins are deleted too).
 * Responds 200 { message }. Errors: 404 not found, 403 not allowed.
 */
export async function deleteActivity(req, res) {
  const sql = getDb()
  const groupId = Number(req.params.groupId)
  const activityId = Number(req.params.activityId)
  if (!Number.isInteger(groupId) || !Number.isInteger(activityId)) return res.status(404).json({ message: 'Group activity not found.' })
  const rows = await sql`
    SELECT a.id, a.created_by, g.owner_id
    FROM group_activities a
    JOIN habit_groups g ON g.id = a.group_id
    WHERE a.id = ${activityId} AND a.group_id = ${groupId}
  `
  const activity = rows[0]
  if (!activity) return res.status(404).json({ message: 'Group activity not found.' })
  if (activity.created_by !== req.userId && activity.owner_id !== req.userId) {
    return res.status(403).json({ message: 'Only the activity creator or group owner can delete this activity.' })
  }
  await sql`DELETE FROM group_activities WHERE id = ${activityId} AND group_id = ${groupId}`
  res.json({ message: 'Group activity deleted. Its points were removed from the leaderboard.' })
}

// ---- POST /api/groups/activities/:activityId/cheer -----------------------------

/**
 * POST /api/groups/activities/:activityId/cheer
 * Body: { userId } - another participant to encourage. One encouragement per sender, recipient and day.
 * Responds 200 { message }. Errors: 404 activity not found, 400 bad target, 409 already sent today.
 */
export async function cheerParticipant(req, res) {
  const sql = getDb()
  const activityId = Number(req.params.activityId)
  const targetId = String(req.body?.userId ?? '')
  const rows = await sql`SELECT a.id, a.group_id FROM group_activities a WHERE a.id = ${activityId}`
  const activity = rows[0]
  if (!activity || !(await requireMember(sql, activity.group_id, req.userId))) return res.status(404).json({ message: 'Group activity not found.' })
  if (!targetId || targetId === req.userId) return res.status(400).json({ message: 'Choose another group member to encourage.' })
  const participants = await sql`SELECT user_id FROM group_activity_members WHERE activity_id = ${activityId}`
  if (!participants.some((member) => member.user_id === targetId)) return res.status(400).json({ message: 'Choose someone participating in this activity.' })
  const inserted = await sql`INSERT INTO group_activity_cheers (activity_id, from_user_id, to_user_id, cheer_date)
    VALUES (${activityId}, ${req.userId}, ${targetId}, (NOW() AT TIME ZONE 'Asia/Singapore')::date)
    ON CONFLICT DO NOTHING RETURNING activity_id`
  if (!inserted.length) return res.status(409).json({ message: 'You have already sent encouragement for today.' })
  res.json({ message: 'Encouragement sent. Keep going together!' })
}
