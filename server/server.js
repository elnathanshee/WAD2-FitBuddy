import app from './app.js'
import { connectDB } from './config/db.js'

const PORT = process.env.PORT || 3000

await connectDB(process.env.MONGODB_URI)

app.listen(PORT, () => {
  console.log(`HabitBuddy API running on http://localhost:${PORT}`)
})
