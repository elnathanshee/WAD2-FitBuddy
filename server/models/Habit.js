const mongoose = require('mongoose')

// NOTE: minimal placeholder. Sanjana owns Habit Management and will extend
// this (frequency, categories, archiving). Gamification only needs to know
// which habits a user has active, so it can tell when a full day is complete.
const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

module.exports = mongoose.model('Habit', habitSchema)
