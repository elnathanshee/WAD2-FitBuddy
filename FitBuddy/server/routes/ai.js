// =============================================================================
// Route table for /api/ai (Gemini habit suggestions and coach chat). Handlers: controllers/aiController.js.
// Express router mounted at /api/ai
// =============================================================================

import { Router } from 'express'
import { suggestHabits, coachChat } from '../controllers/aiController.js'

const router = Router()

// POST /api/ai/suggest-habits - Generates tailored habit recommendations
router.post('/suggest-habits', suggestHabits)

// POST /api/ai/coach-chat - Multi-turn goal coach chatbot
router.post('/coach-chat', coachChat)

export default router

