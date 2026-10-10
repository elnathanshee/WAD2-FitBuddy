const User = require('../models/User')
const { mondayOf, todayStr, addDays } = require('./dateUtils')

/**
 * Builds the weekly leaderboard with a single MongoDB aggregation pipeline.
 *
 * Why it's built this way:
 *
 * 1. It starts from User, not from the points ledger. If it started from the
 *    ledger, anyone who hasn't scored yet this week would vanish from the board
 *    entirely — exactly the people a leaderboard is supposed to motivate. The
 *    $lookup pulls each user's points in, and $ifNull turns "no rows" into 0.
 *
 * 2. The sub-pipeline inside $lookup filters by weekStart *before* grouping, so
 *    Mongo only sums the current week's rows instead of pulling a user's whole
 *    history into memory and filtering afterwards.
 *
 * 3. $setWindowFields with $rank assigns positions inside the database rather
 *    than counting up in JavaScript afterwards, which also gives correct tie
 *    handling for free (two users on 90 points are both rank 1, next is 3).
 *    Requires MongoDB 5.0+; Atlas free tier is well past that.
 */
async function getWeeklyLeaderboard({ forDate = todayStr(), currentUserId = null } = {}) {
  const weekStart = mondayOf(forDate)

  const rows = await User.aggregate([
    {
      $lookup: {
        from: 'pointtransactions',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$weekStart', weekStart] }] } } },
          { $group: { _id: null, total: { $sum: '$points' }, entries: { $sum: 1 } } },
        ],
        as: 'weekly',
      },
    },
    {
      $addFields: {
        weeklyPoints: { $ifNull: [{ $arrayElemAt: ['$weekly.total', 0] }, 0] },
        awardCount: { $ifNull: [{ $arrayElemAt: ['$weekly.entries', 0] }, 0] },
      },
    },
    {
      $setWindowFields: {
        sortBy: { weeklyPoints: -1 },
        output: { rank: { $rank: {} } },
      },
    },
    { $sort: { weeklyPoints: -1, displayName: 1 } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        displayName: 1,
        avatarColor: 1,
        weeklyPoints: 1,
        awardCount: 1,
        rank: 1,
      },
    },
  ])

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    rows: rows.map((r) => ({
      ...r,
      userId: String(r.userId),
      isCurrentUser: currentUserId ? String(r.userId) === String(currentUserId) : false,
    })),
  }
}

module.exports = { getWeeklyLeaderboard }
