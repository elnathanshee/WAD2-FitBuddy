require('dotenv').config()
const express = require('express')
const cors = require('cors')
const routes = require('./routes')

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api', routes)

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }))

// Errors are logged in full on the server but the client only ever sees a
// generic message — never a stack trace or a raw database error.
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' })
})

module.exports = app
