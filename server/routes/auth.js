// =============================================================================
// [IS216 Project Addition: Auth Routes]
// Endpoints:
// - POST /api/auth/signup
// - POST /api/auth/login
// - GET  /api/auth/me
// - GET  /api/auth/demo-users
// =============================================================================

import { Router } from 'express'
import { signup, login, getCurrentUser, getDemoUsers } from '../controllers/authController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', requireUser, getCurrentUser)
router.get('/demo-users', getDemoUsers)

export default router
