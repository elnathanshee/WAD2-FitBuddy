import { getDb } from '../config/neon.js'

const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

async function requireMember(sql, groupId, userId) {
  const rows = await sql`SELECT 1 FROM habit_group_members WHERE group_id = ${groupId} AND user_id = ${userId}`
  return rows.length > 0
}

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
  const groups = new Map()
  for (const row of rows) {
    if (!groups.has(row.id)) groups.set(row.id, { id: row.id, name: row.name, ownerId: row.owner_id, members: [], activities: [], leaderboard: [] })
    groups.get(row.id).members.push({ userId: row.member_id, displayName: row.display_name, avatarColor: row.avatar_color })
  }
  for (const group of groups.values()) {
    const [activities, scores] = await Promise.all([
      sql`SELECT a.id, a.title, a.start_date::text, a.end_date::text, a.points,
        EXISTS(SELECT 1 FROM group_checkins c WHERE c.activity_id = a.id AND c.user_id = ${req.userId} AND c.checkin_date = (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS checked_in_today
        FROM group_activities a WHERE a.group_id = ${group.id} ORDER BY a.end_date DESC, a.id DESC`,
      sql`SELECT m.user_id, u.display_name, u.avatar_color, COALESCE(SUM(c.points), 0)::int AS points,
        COUNT(c.id)::int AS checkins
        FROM habit_group_members m JOIN users u ON u.user_id = m.user_id
        LEFT JOIN group_checkins c ON c.group_id = m.group_id AND c.user_id = m.user_id
        WHERE m.group_id = ${group.id} GROUP BY m.user_id, u.display_name, u.avatar_color
        ORDER BY points DESC, u.display_name`,
    ])
    group.activities = activities.map(a => ({ id: a.id, title: a.title, startDate: a.start_date, endDate: a.end_date, points: a.points, checkedInToday: a.checked_in_today }))
    let rank = 0, previous = null
    group.leaderboard = scores.map((entry, index) => {
      if (entry.points !== previous) { rank = index + 1; previous = entry.points }
      return { userId: entry.user_id, displayName: entry.display_name, avatarColor: entry.avatar_color, points: entry.points, checkins: entry.checkins, rank, isCurrentUser: entry.user_id === req.userId }
    })
  }
  res.json({ groups: [...groups.values()] })
}

export async function createGroup(req, res) {
  const sql = getDb()
  const name = String(req.body?.name ?? '').trim()
  const memberIds = [...new Set(Array.isArray(req.body?.memberIds) ? req.body.memberIds.filter(id => typeof id === 'string' && id && id !== req.userId) : [])]
  if (!name || name.length > 60) return res.status(400).json({ message: 'Group name must be 1–60 characters.' })
  if (memberIds.length < 1 || memberIds.length > 19) return res.status(400).json({ message: 'Choose 1–19 friends to start your group.' })
  const friends = await sql`SELECT CASE WHEN requester_id = ${req.userId} THEN addressee_id ELSE requester_id END AS user_id FROM friendships WHERE status = 'accepted' AND (requester_id = ${req.userId} OR addressee_id = ${req.userId})`
  const friendIds = new Set(friends.map(row => row.user_id))
  if (memberIds.some(id => !friendIds.has(id))) return res.status(403).json({ message: 'Groups can only include your accepted friends.' })
  const rows = await sql`INSERT INTO habit_groups (name, owner_id) VALUES (${name}, ${req.userId}) RETURNING id`
  const groupId = rows[0].id
  for (const userId of [req.userId, ...memberIds]) await sql`INSERT INTO habit_group_members (group_id, user_id) VALUES (${groupId}, ${userId}) ON CONFLICT DO NOTHING`
  res.status(201).json({ groupId, message: 'Habit group created.' })
}

export async function createActivity(req, res) {
  const sql = getDb()
  const groupId = Number(req.params.groupId)
  const { title, startDate, endDate } = req.body ?? {}
  const points = Number(req.body?.points)
  if (!Number.isInteger(groupId) || !(await requireMember(sql, groupId, req.userId))) return res.status(404).json({ message: 'Habit group not found.' })
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 80 || !validDate(startDate) || !validDate(endDate) || endDate < startDate || !Number.isInteger(points) || points < 1 || points > 1000) {
    return res.status(400).json({ message: 'Add an activity name, valid dates, and 1–1000 points per check-in.' })
  }
  const rows = await sql`INSERT INTO group_activities (group_id, title, start_date, end_date, points, created_by) VALUES (${groupId}, ${title.trim()}, ${startDate}, ${endDate}, ${points}, ${req.userId}) RETURNING id`
  res.status(201).json({ activityId: rows[0].id, message: 'Group activity created.' })
}

export async function checkIn(req, res) {
  const sql = getDb()
  const activityId = Number(req.params.activityId)
  const activityRows = await sql`SELECT a.*, (NOW() AT TIME ZONE 'Asia/Singapore')::date::text AS today FROM group_activities a WHERE a.id = ${activityId}`
  const activity = activityRows[0]
  if (!activity || !(await requireMember(sql, activity.group_id, req.userId))) return res.status(404).json({ message: 'Group activity not found.' })
  if (activity.today < String(activity.start_date).slice(0, 10) || activity.today > String(activity.end_date).slice(0, 10)) return res.status(400).json({ message: 'This activity is outside its check-in dates.' })
  const selected = [...new Set(Array.isArray(req.body?.userIds) ? req.body.userIds.filter(id => typeof id === 'string') : [])]
  if (!selected.includes(req.userId) || selected.length > 20) return res.status(400).json({ message: 'Include yourself and select up to 20 group members.' })
  const members = await sql`SELECT user_id FROM habit_group_members WHERE group_id = ${activity.group_id}`
  const memberIds = new Set(members.map(m => m.user_id))
  if (selected.some(id => !memberIds.has(id))) return res.status(403).json({ message: 'Only group members can check in.' })
  let added = 0
  for (const userId of selected) {
    const inserted = await sql`INSERT INTO group_checkins (activity_id, group_id, user_id, checkin_date, points)
      VALUES (${activity.id}, ${activity.group_id}, ${userId}, (NOW() AT TIME ZONE 'Asia/Singapore')::date, ${activity.points})
      ON CONFLICT (activity_id, user_id, checkin_date) DO NOTHING RETURNING id`
    added += inserted.length
  }
  res.json({ added, message: added ? `Checked in ${added} ${added === 1 ? 'member' : 'members'} for ${activity.points} points each.` : 'Those members already checked in today.' })
}
