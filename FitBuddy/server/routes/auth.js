// =============================================================================
// [IS216 Project Addition: Auth Routes]
// Route table for /api/auth (signup, login, profile, goal).
// Endpoints:
// - POST /api/auth/signup
// - POST /api/auth/login
// - GET  /api/auth/me
// - GET  /api/auth/demo-users
// - GET and PUT /api/auth/goal, PUT /api/auth/profile
// Handlers live in controllers/authController.js.
// =============================================================================

import { Router } from 'express'
import { signup, login, getCurrentUser, getDemoUsers, updateProfile, getGoal, updateGoal } from '../controllers/authController.js'
import { requireUser } from '../middleware/requireUser.js'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', requireUser, getCurrentUser)
router.get('/goal', requireUser, getGoal)
router.put('/goal', requireUser, updateGoal)
router.put('/profile', requireUser, updateProfile)
router.get('/demo-users', getDemoUsers)

export default router

