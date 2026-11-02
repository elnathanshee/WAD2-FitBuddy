// Route table for GET /api/achievements (the achievements page). Handler: controllers/achievementsController.js.

import { Router } from 'express'
import { listAchievements } from '../controllers/achievementsController.js'

// Mounted at /api/achievements behind requireUser, so req.userId is always set.
const router = Router()

router.get('/', listAchievements)

export default router
