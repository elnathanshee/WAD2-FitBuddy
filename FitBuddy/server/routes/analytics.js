import { Router } from 'express'
import { getWeeklySummary } from '../controllers/analyticsController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/weekly-summary', requireUser, getWeeklySummary)

export default router

