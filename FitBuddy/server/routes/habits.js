import { Router } from 'express'
import { listHabits, createHabit, getHabit, updateHabit, deleteHabit, checkIn, setCheckIn, undoCheckIn, getHistory } from '../controllers/neonHabitController.js'

// All routes below are mounted at /api/habits and already require a user
// (see middleware/requireUser.js), so req.userId is always available.
const router = Router()

// Habit CRUD
router.get('/', listHabits)
router.post('/', createHabit)
router.get('/:id', getHabit)
router.put('/:id', updateHabit)
router.delete('/:id', deleteHabit)

// Daily check-ins
router.post('/:id/checkins', checkIn)
router.put('/:id/checkins/:date', setCheckIn)
router.delete('/:id/checkins/:date', undoCheckIn)

// Completion history + streaks
router.get('/:id/history', getHistory)

export default router
