import mongoose from 'mongoose'

// Minimal profile so the leaderboard can show a name and colour instead of a
// raw id. Deliberately keyed by the same STRING userId that habits and
// check-ins already use (see middleware/requireUser.js), not by _id, so it
// slots in without changing anything in the habit code.
//
// When real authentication lands (Elnathan's scope) this is replaced by the
// real User model and `userId` becomes that user's id.
const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    avatarColor: { type: String, default: '#7FA3D1' },
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)
