// Route table for /api/analytics (dashboard charts: summary and weekly summary). Handlers: controllers/analyticsController.js.
// Each route asks for a logged-in user itself, because app.js mounts this router without requireUser.

import { Router } from 'express'
import { getSummary, getWeeklySummary } from '../controllers/analyticsController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/summary', requireUser, getSummary)
router.get('/weekly-summary', requireUser, getWeeklySummary)

export default router
