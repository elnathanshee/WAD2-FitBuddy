import { Router } from 'express'
import * as mongoHabits from '../controllers/habitController.js'
import * as neonHabits from '../controllers/neonHabitController.js'

function useNeon() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)
}

const listHabits = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).listHabits(req, res, next)
const createHabit = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).createHabit(req, res, next)
const getHabit = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).getHabit(req, res, next)
const updateHabit = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).updateHabit(req, res, next)
const deleteHabit = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).deleteHabit(req, res, next)
const checkIn = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).checkIn(req, res, next)
const setCheckIn = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).setCheckIn(req, res, next)
const undoCheckIn = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).undoCheckIn(req, res, next)
const getHistory = (req, res, next) => (useNeon() ? neonHabits : mongoHabits).getHistory(req, res, next)

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
