// Route table for /api/challenges (friend-vs-friend duels on the Dashboard). Handlers: controllers/challengeController.js.
// Each route asks for a logged-in user itself, because app.js mounts this router without requireUser.

import { Router } from 'express'
import { listChallenges, createChallenge, recordChallengeProgress, acceptChallenge, declineChallenge, deleteChallenge } from '../controllers/challengeController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/', requireUser, listChallenges)
router.post('/', requireUser, createChallenge)
router.post('/:id/progress', requireUser, recordChallengeProgress)
// Only the invited friend can accept or decline, and only while pending
router.post('/:id/accept', requireUser, acceptChallenge)
router.post('/:id/decline', requireUser, declineChallenge)
// Creator cancels a pending challenge or dismisses a declined one
router.delete('/:id', requireUser, deleteChallenge)

export default router

