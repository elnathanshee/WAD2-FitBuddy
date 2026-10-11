import mongoose from 'mongoose'

// One document per habit per calendar day.
//
// Why a separate collection instead of an array inside Habit?
//  - Completion history grows forever; keeping it out of the Habit document
//    keeps habit reads small.
//  - It makes date-range queries easy (history for the last 7/30 days),
//    which the analytics dashboard will also need.
//
// Why store the date as a 'YYYY-MM-DD' string instead of a Date?
//  - A check-in belongs to the user's *local* calendar day. A JS Date is a
//    moment in UTC, so 11pm in Singapore would be saved as the previous
//    day in UTC. A plain string avoids that whole class of bug.
const checkInSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    // Progress logged that day, e.g. 5 (glasses) or 1.5 (km), rounded to 2
    // decimal places. The day counts as "completed" when count >= the habit's
    // target.amount.
    count: { type: Number, min: 0, default: 1 },
  },
  { timestamps: true }
)

// A habit can only have one check-in document per day.
checkInSchema.index({ habitId: 1, date: 1 }, { unique: true })

export default mongoose.model('CheckIn', checkInSchema)
