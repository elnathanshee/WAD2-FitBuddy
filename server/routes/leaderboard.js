import { Router } from 'express'
import { myScore, upsertProfile, weeklyLeaderboard } from '../controllers/leaderboardController.js'

// Mounted at /api/leaderboard behind requireUser, so req.userId is always set
// (same convention as routes/habits.js).
const router = Router()

router.get('/weekly', weeklyLeaderboard)
router.get('/me', myScore)
router.put('/profile', upsertProfile)

export default router
