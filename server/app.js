import express from 'express'
import cors from 'cors'
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

export default app
