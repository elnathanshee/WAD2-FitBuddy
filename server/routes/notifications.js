// Route table for /api/notifications (OneSignal push status, test, habit reminders, broadcast). Handlers: controllers/notificationController.js.

import { Router } from 'express'
import {
  getStatus,
  sendTestNotification,
  remindHabits,
  broadcastNotification,
} from '../controllers/notificationController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

// All notification routes need a logged-in user
router.get('/status', requireUser, getStatus)
router.post('/test', requireUser, sendTestNotification)
router.post('/remind-habits', requireUser, remindHabits)
router.post('/broadcast', requireUser, broadcastNotification)

export default router

