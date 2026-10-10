const mongoose = require('mongoose')

// NOTE: minimal placeholder so gamification has something to join against.
// Elnathan owns Authentication & Profile — he will extend this (password hash,
// profile fields, settings). Keep changes here additive to avoid conflicts.
const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  avatarColor: { type: String, default: '#7FA3D1' },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
