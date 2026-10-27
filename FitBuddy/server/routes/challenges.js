import { Router } from 'express'
import { listChallenges, createChallenge, recordChallengeProgress, acceptChallenge, declineChallenge, deleteChallenge } from '../controllers/challengeController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/', requireUser, listChallenges)
router.post('/', requireUser, createChallenge)
router.post('/:id/progress', requireUser, recordChallengeProgress)
router.post('/:id/accept', requireUser, acceptChallenge)
router.post('/:id/decline', requireUser, declineChallenge)
router.delete('/:id', requireUser, deleteChallenge)

export default router

