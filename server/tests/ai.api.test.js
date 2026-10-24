import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'

const ALICE = { 'x-user-id': 'alice' }

describe('POST /api/ai/suggest-habits', () => {
  test('rejects requests without authentication header', async () => {
    const res = await request(app).post('/api/ai/suggest-habits').send({ prompt: 'Be healthier' })
    assert.equal(res.status, 401)
  })

  test('requires prompt or questionnaire', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-habits')
      .set(ALICE)
      .send({ apiKey: 'dummy-key' })

    assert.equal(res.status, 400)
    assert.match(res.body.message, /Please provide either a goal description/)
  })

  test('requires a Gemini API key if process.env.GEMINI_API_KEY is not set', async () => {
    const originalEnv = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    try {
      const res = await request(app)
        .post('/api/ai/suggest-habits')
        .set(ALICE)
        .send({ prompt: 'I want to drink more water and exercise' })

      assert.equal(res.status, 400)
      assert.match(res.body.message, /Missing Gemini API Key/)
    } finally {
      if (originalEnv) process.env.GEMINI_API_KEY = originalEnv
    }
  })
})


describe('POST /api/ai/coach-chat', () => {
  test('rejects requests without authentication header', async () => {
    const res = await request(app)
      .post('/api/ai/coach-chat')
      .send({ messages: [{ role: 'user', text: 'Hi' }] })
    assert.equal(res.status, 401)
  })

  test('requires at least one message', async () => {
    const res = await request(app)
      .post('/api/ai/coach-chat')
      .set(ALICE)
      .send({ messages: [], apiKey: 'dummy-key' })

    assert.equal(res.status, 400)
    assert.match(res.body.message, /at least one message/)
  })

  test('requires the last message to come from the user', async () => {
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

    assert.equal(res.status, 400)
    assert.match(res.body.message, /last message must come from the user/)
  })
})
