const { getWeeklyLeaderboard } = require('../services/leaderboardService')
const User = require('../models/User')

/** GET /api/leaderboard/weekly */
async function weekly(req, res, next) {
  try {
    const data = await getWeeklyLeaderboard({ currentUserId: req.userId })
    return res.json({ success: true, data })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/users
 * Temporary: until authentication lands, the demo needs a way to switch between
 * users. Returns the minimal public info only — never emails or credentials.
 */
async function listUsers(req, res, next) {
  try {
    const users = await User.find().select('displayName avatarColor').sort({ displayName: 1 }).lean()
    return res.json({
      success: true,
      data: users.map((u) => ({ id: String(u._id), displayName: u.displayName, avatarColor: u.avatarColor })),
    })
  } catch (err) {
    return next(err)
  }
}

module.exports = { weekly, listUsers }
