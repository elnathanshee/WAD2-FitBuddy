const CheckIn = require('../models/CheckIn')
const Habit = require('../models/Habit')
const { awardForCheckIn } = require('../services/pointsService')
const { getStreakForHabit } = require('../services/streakService')
const { todayStr } = require('../services/dateUtils')

/**
 * POST /api/checkins
 * Body: { habitId, date? }  — date defaults to today, format "YYYY-MM-DD".
 *
 * Records the completion, then awards points. Returns the new streak and the
 * exact awards earned so the frontend can show "+30 points!" rather than
 * guessing at the numbers itself.
 */
async function createCheckIn(req, res, next) {
  try {
    const userId = req.userId
    const { habitId } = req.body
    const date = req.body.date || todayStr()

    if (!habitId) {
      return res.status(400).json({ success: false, message: 'habitId is required.' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'date must be in YYYY-MM-DD format.' })
    }
    if (date > todayStr()) {
      return res.status(400).json({ success: false, message: "You can't check in for a future date." })
    }

    const habit = await Habit.findById(habitId)
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found.' })
    }
    // Ownership check: you may only check in your own habits.
    if (String(habit.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "You can't check in someone else's habit." })
    }

    const existing = await CheckIn.findOne({ habitId, date })
    if (existing) {
      return res.status(409).json({ success: false, message: 'Already checked in for this habit today.' })
    }

    const checkIn = await CheckIn.create({ habitId, userId, date })
    const result = await awardForCheckIn({ userId, habitId, date })

    return res.status(201).json({
      success: true,
      data: {
        checkIn: { id: checkIn._id, habitId, date },
        awards: result.awards,
        totalAwarded: result.totalAwarded,
        currentStreak: result.currentStreak,
      },
    })
  } catch (err) {
    // The unique index is the backstop if two requests race past the check above.
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Already checked in for this habit today.' })
    }
    return next(err)
  }
}

/** GET /api/habits — the current user's habits, each with its streak and today's status. */
async function listHabitsWithStreaks(req, res, next) {
  try {
    const userId = req.userId
    const today = todayStr()
    const habits = await Habit.find({ userId, isActive: true }).sort({ createdAt: 1 }).lean()

    const enriched = await Promise.all(
      habits.map(async (h) => {
        const { currentStreak, longestStreak } = await getStreakForHabit(h._id)
        const done = await CheckIn.exists({ habitId: h._id, date: today })
        return {
          id: String(h._id),
          name: h.name,
          currentStreak,
          longestStreak,
          completedToday: Boolean(done),
        }
      })
    )

    return res.json({ success: true, data: enriched })
  } catch (err) {
    return next(err)
  }
}

module.exports = { createCheckIn, listHabitsWithStreaks }
