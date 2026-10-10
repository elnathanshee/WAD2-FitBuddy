const mongoose = require('mongoose')

// Append-only points ledger. Rows are only ever inserted, never updated or
// deleted.
//
// This is the design decision that makes the "weekly leaderboard that resets
// every week" work without destroying anything: each row is stamped with the
// Monday of the week it was earned in, so "this week's score" is just a filter
// on weekStart. Next Monday the filter value changes and last week's rows stop
// counting toward the current board — but they are all still there, so an
// all-time total or a "best week ever" view stays computable later.
const pointTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  reason: {
    type: String,
    required: true,
    enum: ['CHECKIN', 'ALL_DAILY_BONUS', 'STREAK_BONUS'],
  },
  // Monday of the ISO week this was earned in, as "YYYY-MM-DD".
  weekStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { timestamps: true })

pointTransactionSchema.index({ userId: 1, weekStart: 1 })

module.exports = mongoose.model('PointTransaction', pointTransactionSchema)
