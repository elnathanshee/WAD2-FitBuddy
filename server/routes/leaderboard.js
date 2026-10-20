import { Router } from 'express'
import * as mongoLb from '../controllers/leaderboardController.js'
import * as neonLb from '../controllers/neonLeaderboardController.js'

function useNeon() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)
}

const weeklyLeaderboard = (req, res, next) => (useNeon() ? neonLb : mongoLb).weeklyLeaderboard(req, res, next)
const myScore = (req, res, next) => (useNeon() ? neonLb : mongoLb).myScore(req, res, next)
const upsertProfile = (req, res, next) => (useNeon() ? neonLb : mongoLb).upsertProfile(req, res, next)
const sendCheer = (req, res, next) => (useNeon() ? neonLb : mongoLb).sendCheer(req, res, next)
const getCheers = (req, res, next) => (useNeon() ? neonLb : mongoLb).getCheers(req, res, next)

// Mounted at /api/leaderboard behind requireUser, so req.userId is always set
const router = Router()

router.get('/weekly', weeklyLeaderboard)
router.get('/me', myScore)
router.put('/profile', upsertProfile)
router.post('/cheer', sendCheer)
router.get('/cheers', getCheers)

export default router
