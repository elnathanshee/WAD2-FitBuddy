// The Express app: registers CORS, JSON parsing, every /api route group, the 404 handler and the
// error handler. server.js starts it; the tests import it directly.
// Routes are available both with and without the /api prefix.
//
// Third-party library: Express (https://expressjs.com) — the web server and routing used by the whole API
import express from 'express'
// Third-party library: cors (https://github.com/expressjs/cors) — lets the browser call the API from another origin
import cors from 'cors'
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

// GET /api/health: a simple "is the server up" check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok' })
})

// Route groups. requireUser (login check) is added here for the groups that always need it;
// auth, neon, challenges, health-sync and analytics routes ask for it route by route instead.
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

// Anything that matched no route above
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
})

// Error handler: Express 5 sends errors thrown in async handlers here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed JSON body (express.json sets status 400 on these)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' })
  }
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: err.message })
  }
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on the server' })
})

export default app
