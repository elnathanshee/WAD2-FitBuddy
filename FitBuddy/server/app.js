import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import habitRoutes from './routes/habits.js'
import leaderboardRoutes from './routes/leaderboard.js'
import aiRoutes from './routes/ai.js'
import neonRoutes from './routes/neon.js'
import authRoutes from './routes/auth.js'
import challengeRoutes from './routes/challenges.js'
import healthSyncRoutes from './routes/healthSync.js'
import analyticsRoutes from './routes/analytics.js'
import achievementsRoutes from './routes/achievements.js'
import friendRoutes from './routes/friends.js'
import notificationRoutes from './routes/notifications.js'
import groupRoutes from './routes/groups.js'
import { requireUser } from './middleware/requireUser.js'

// The Express app is created here (without listening) so tests can import it.
const app = express()

app.use(cors())
app.use(express.json())

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok' })
})

app.use(['/api/auth', '/auth'], authRoutes)
app.use(['/api/neon', '/neon'], neonRoutes)
app.use(['/api/habits', '/habits'], requireUser, habitRoutes)
app.use(['/api/leaderboard', '/leaderboard'], requireUser, leaderboardRoutes)
app.use(['/api/friends', '/friends'], requireUser, friendRoutes)
app.use(['/api/groups', '/groups'], requireUser, groupRoutes)
app.use(['/api/ai', '/ai'], requireUser, aiRoutes)
app.use(['/api/challenges', '/challenges'], challengeRoutes)
app.use(['/api/health-sync', '/health-sync'], healthSyncRoutes)
app.use(['/api/analytics', '/analytics'], analyticsRoutes)
app.use(['/api/achievements', '/achievements'], requireUser, achievementsRoutes)
app.use(['/api/notifications', '/notifications'], requireUser, notificationRoutes)

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
})

// Error handler: Express 5 sends errors thrown in async handlers here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Schema validation failed, e.g. empty name → list each readable message
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors).map((e) => e.message).join('. ')
    return res.status(400).json({ message })
  }
  // A value of the wrong type, e.g. target.amount: 'abc'
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid value for ${err.path}` })
  }
  // Malformed JSON body (express.json sets status 400 on these)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' })
  }
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on the server' })
})

export default app
