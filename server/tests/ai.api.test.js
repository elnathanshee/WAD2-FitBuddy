// Tests the /api/ai endpoints: input validation and auth errors (no real Gemini call is made).
// Third-party library: Vitest (https://vitest.dev) — the test runner used for all backend unit tests
import { describe, it, expect } from 'vitest'
// Third-party library: Supertest (https://github.com/forwardemail/supertest) — sends fake HTTP requests to the Express app in tests
import request from 'supertest'
import app from '../app.js'

const ALICE = { 'x-user-id': 'alice' }

describe('POST /api/ai/suggest-habits', () => {
  it('rejects requests without authentication header', async () => {
    const res = await request(app).post('/api/ai/suggest-habits').send({ prompt: 'Be healthier' })
    expect(res.status).toBe(401)
  })

  it('requires prompt or questionnaire', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-habits')
      .set(ALICE)
      .send({ apiKey: 'dummy-key' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Please provide either a goal description/)
  })

  it('requires a Gemini API key if process.env.GEMINI_API_KEY is not set', async () => {
    const originalEnv = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    try {
      const res = await request(app)
        .post('/api/ai/suggest-habits')
        .set(ALICE)
        .send({ prompt: 'I want to drink more water and exercise' })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/Missing Gemini API Key/)
    } finally {
      if (originalEnv) process.env.GEMINI_API_KEY = originalEnv
    }
  })
})


describe('POST /api/ai/coach-chat', () => {
  it('rejects requests without authentication header', async () => {
    const res = await request(app)
      .post('/api/ai/coach-chat')
      .send({ messages: [{ role: 'user', text: 'Hi' }] })
    expect(res.status).toBe(401)
  })

  it('requires at least one message', async () => {
    const res = await request(app)
      .post('/api/ai/coach-chat')
      .set(ALICE)
      .send({ messages: [], apiKey: 'dummy-key' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/at least one message/)
  })

  it('requires the last message to come from the user', async () => {
    const res = await request(app)
      .post('/api/ai/coach-chat')
      .set(ALICE)
      .send({
        messages: [
          { role: 'user', text: 'I want to run a 5K' },
          { role: 'model', text: 'Great goal!' },
        ],
        apiKey: 'dummy-key',
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/last message must come from the user/)
  })
})
