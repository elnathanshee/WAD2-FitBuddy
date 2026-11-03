// Route table for /api/health-sync (simulated Google Health connect, sync and today's metrics).
// Handlers: controllers/healthSyncController.js.

import { Router } from 'express'
import { disconnectGoogleHealth, getGoogleHealthStatus, getTodayMetrics, googleHealthCallback, startGoogleHealthConnect, syncGoogleHealth } from '../controllers/healthSyncController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/today', requireUser, getTodayMetrics)
router.get('/google/status', requireUser, getGoogleHealthStatus)
router.get('/google/connect', requireUser, startGoogleHealthConnect)
router.post('/google/connect', requireUser, startGoogleHealthConnect)
router.get('/google/callback', googleHealthCallback)
router.post('/google/sync', requireUser, syncGoogleHealth)
router.delete('/google/connection', requireUser, disconnectGoogleHealth)

export default router
