require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')

const PORT = process.env.PORT || 4000
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('\n  MONGODB_URI is not set. Copy .env.example to .env and add your Atlas connection string.\n')
  process.exit(1)
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => console.log(`FitBuddy API listening on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })
