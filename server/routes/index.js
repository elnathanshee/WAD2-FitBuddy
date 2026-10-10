const express = require('express')
const checkinController = require('../controllers/checkinController')
const leaderboardController = require('../controllers/leaderboardController')

const router = express.Router()

/**
 * TEMPORARY user identification.
 *
 * Authentication (Elnathan's scope) isn't merged yet, so the current user is
 * read from an x-user-id header. When the real auth middleware lands, this is
 * the ONLY thing that changes: it sets req.userId from the verified JWT instead
 * of from a header, and every controller below keeps working unchanged.
 */
router.use((req, res, next) => {
  req.userId = req.header('x-user-id') || null
  next()
})

function requireUser(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: 'Missing x-user-id header (stands in for login).' })
  }
  next()
}

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }))

router.get('/users', leaderboardController.listUsers)
router.get('/habits', requireUser, checkinController.listHabitsWithStreaks)
router.post('/checkins', requireUser, checkinController.createCheckIn)
router.get('/leaderboard/weekly', leaderboardController.weekly)

module.exports = router
