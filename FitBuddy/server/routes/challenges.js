import { Router } from 'express'
import { listChallenges, createChallenge, recordChallengeProgress } from '../controllers/challengeController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.get('/', requireUser, listChallenges)
router.post('/', requireUser, createChallenge)
router.post('/:id/progress', requireUser, recordChallengeProgress)

export default router

