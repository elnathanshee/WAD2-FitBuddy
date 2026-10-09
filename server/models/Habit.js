import mongoose from 'mongoose'

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

    category: { type: String, enum: HABIT_CATEGORIES, default: 'other' },

    // 'daily'  → aim to complete every day
    // 'weekly' → aim to complete `timesPerWeek` days per week (ignored for daily habits)
    frequency: { type: String, enum: HABIT_FREQUENCIES, default: 'daily' },
    timesPerWeek: { type: Number, min: 1, max: 7, default: 7 },

    // What "done for the day" means, e.g. { amount: 8, unit: 'glasses' }
    target: {
      amount: { type: Number, min: [1, 'Target must be at least 1'], default: 1 },
      unit: { type: String, trim: true, maxlength: 20, default: 'times' },
    },

    // Bootstrap Icons class name, e.g. 'bi-droplet'
    icon: { type: String, default: 'bi-check-circle' },
    colour: {
      type: String,
      match: [/^#[0-9a-fA-F]{6}$/, 'Colour must be a hex code like #0d6efd'],
      default: '#0d6efd',
    },
  },
  { timestamps: true }
)

export default mongoose.model('Habit', habitSchema)
