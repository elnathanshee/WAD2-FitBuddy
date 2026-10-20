import { Router } from 'express'
import { getTodayMetrics, simulateHealthSync } from '../controllers/healthSyncController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/today', requireUser, getTodayMetrics)
router.post('/simulate', requireUser, simulateHealthSync)

export default router
