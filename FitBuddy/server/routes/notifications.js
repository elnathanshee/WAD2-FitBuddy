import { Router } from 'express'
import {
  getStatus,
  sendTestNotification,
  remindHabits,
  broadcastNotification,
} from '../controllers/notificationController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

// Notification routes (authenticated)
router.get('/status', requireUser, getStatus)
router.post('/test', requireUser, sendTestNotification)
router.post('/remind-habits', requireUser, remindHabits)
router.post('/broadcast', requireUser, broadcastNotification)

export default router

