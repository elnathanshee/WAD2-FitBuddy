const mongoose = require('mongoose')

// A check-in is an append-only event: "this habit was completed on this date".
// Storing completions as their own documents (rather than a boolean on Habit)
// is what makes streaks, history and the weekly leaderboard computable at all —
// a boolean can only say "done now", it can't say what happened last Tuesday.
const checkInSchema = new mongoose.Schema({
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Stored as a date-only string "YYYY-MM-DD" so "did they check in today" never
  // depends on what time of day it is, or on the server's timezone.
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { timestamps: true })

// Database-level guarantee that the same habit cannot be checked in twice on the
// same day. This is a second line of defence: the service layer checks first, but
// two simultaneous requests could both pass that check, and this index stops them.
checkInSchema.index({ habitId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('CheckIn', checkInSchema)
