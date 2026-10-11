import mongoose from 'mongoose'

// Suggested categories shown in the form. Users can also type their own
// (choosing "Other" in the form), so the category is not limited to these.
export const HABIT_CATEGORIES = ['exercise', 'water', 'sleep', 'study', 'other']
export const HABIT_FREQUENCIES = ['daily', 'weekly']

const habitSchema = new mongoose.Schema(
  {
    // Owner of the habit. A String for now because login is mocked;
    // switch to an ObjectId ref to 'User' once real auth exists.
    userId: { type: String, required: true, index: true },

    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      maxlength: [50, 'Habit name must be 50 characters or fewer'],
    },

    category: {
      type: String,
      trim: true,
      maxlength: [30, 'Category must be 30 characters or fewer'],
      default: 'other',
    },

    // 'daily'  → target.amount is per day,  e.g. 8 glasses a day
    // 'weekly' → target.amount is per week (Monday–Sunday), e.g. 150 minutes a week
    frequency: { type: String, enum: HABIT_FREQUENCIES, default: 'daily' },

    // What "done" means for one day (daily) or one week (weekly), e.g.
    // { amount: 8, unit: 'glasses' } or { amount: 2.5, unit: 'km' }.
    // Decimals are rounded to 2 places.
    target: {
      amount: {
        type: Number,
        min: [0.01, 'Target must be more than 0'],
        max: [100000, 'Target must be 100,000 or less'],
        set: (value) => (typeof value === 'number' ? Math.round(value * 100) / 100 : value),
        default: 1,
      },
      unit: { type: String, trim: true, maxlength: 20, default: 'times' },
    },

    // An emoji, e.g. '💧'. maxlength allows multi-part emojis like '🧑‍💻'.
    icon: {
      type: String,
      trim: true,
      maxlength: [16, 'Icon must be a single emoji'],
      default: '✅',
    },
  },
  { timestamps: true }
)

export default mongoose.model('Habit', habitSchema)
