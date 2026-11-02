// Route table for /api/groups (group activities on the Groups page). Handlers: controllers/groupController.js.
// Mounted behind requireUser in app.js, so req.userId is always set.

import { Router } from 'express'
import { checkIn, cheerParticipant, createActivity, createGroup, deleteActivity, listGroups } from '../controllers/groupController.js'

const router = Router()
router.get('/', listGroups)
router.post('/', createGroup)
router.post('/:groupId/activities', createActivity)
router.delete('/:groupId/activities/:activityId', deleteActivity)
router.post('/activities/:activityId/check-in', checkIn)
router.post('/activities/:activityId/cheer', cheerParticipant)
export default router
