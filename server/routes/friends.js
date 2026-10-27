import { Router } from 'express'
import {
  listFriends,
  searchUsers,
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  friendProfile,
  removeFriend,
} from '../controllers/friendController.js'

// Mounted at /api/friends behind requireUser, so req.userId is always set.
// The fixed paths (/search, /requests) come before the /:userId routes.
const router = Router()

router.get('/', listFriends)
router.get('/search', searchUsers)
router.post('/requests', sendRequest)
router.post('/requests/:id/accept', acceptRequest)
router.post('/requests/:id/reject', rejectRequest)
router.delete('/requests/:id', cancelRequest)
router.get('/:userId/profile', friendProfile)
router.delete('/:userId', removeFriend)

export default router
