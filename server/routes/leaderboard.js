import { Router } from 'express'
import { weeklyLeaderboard, myScore, upsertProfile, sendCheer, getCheers } from '../controllers/neonLeaderboardController.js'

// Mounted at /api/leaderboard behind requireUser, so req.userId is always set
const router = Router()

router.get('/weekly', weeklyLeaderboard)
router.get('/me', myScore)
router.put('/profile', upsertProfile)
router.post('/cheer', sendCheer)
router.get('/cheers', getCheers)

export default router
