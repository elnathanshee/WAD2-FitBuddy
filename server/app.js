import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import habitRoutes from './routes/habits.js'
import { requireUser } from './middleware/requireUser.js'

// The Express app is created here (without listening) so tests can import it.
const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/habits', requireUser, habitRoutes)

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
