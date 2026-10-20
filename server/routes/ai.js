// =============================================================================
// [IS216 Project Addition: Gemini AI Route]
// Express router mounted at /api/ai
// =============================================================================

import { Router } from 'express'
import { suggestHabits } from '../controllers/aiController.js'

const router = Router()

// POST /api/ai/suggest-habits - Generates tailored habit recommendations
router.post('/suggest-habits', suggestHabits)

export default router

