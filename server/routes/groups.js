import { Router } from 'express'
import { checkIn, createActivity, createGroup, deleteActivity, listGroups } from '../controllers/groupController.js'

const router = Router()
router.get('/', listGroups)
router.post('/', createGroup)
router.post('/:groupId/activities', createActivity)
router.delete('/:groupId/activities/:activityId', deleteActivity)
router.post('/activities/:activityId/check-in', checkIn)
export default router
