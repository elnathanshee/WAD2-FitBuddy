import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../app.js'
import {
  sendPushNotification,
  sendHabitReminder,
  sendCheerNotification,
  sendChallengeNotification,
} from '../services/notificationService.js'

const DEMO_USER = { 'x-user-id': 'demo-test-user' }

describe('OneSignal Notifications API', () => {
  test('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/notifications/status')
    assert.equal(res.status, 401)
  })

  test('GET /api/notifications/status returns configuration status', async () => {
    const res = await request(app).get('/api/notifications/status').set(DEMO_USER)
    assert.equal(res.status, 200)
    assert.equal(typeof res.body.configured, 'boolean')
  })

  test('POST /api/notifications/test sends a test notification', async () => {
    const res = await request(app)
      .post('/api/notifications/test')
      .set(DEMO_USER)
      .send({ title: 'Test', message: 'Hello from test!' })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
  })

  test('POST /api/notifications/remind-habits triggers habit check-in reminder', async () => {
    const res = await request(app)
      .post('/api/notifications/remind-habits')
      .set(DEMO_USER)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
  })
})

describe('OneSignal Notification Service Functions', () => {
  test('sendPushNotification handles simulated fallback mode', async () => {
    const result = await sendPushNotification({
      userIds: ['user-123'],
      title: 'Unit Test',
      message: 'Running in simulated fallback',
    })

    assert.equal(result.success, true)
  })

  test('sendHabitReminder constructs proper reminder format', async () => {
    const result = await sendHabitReminder('user-123', {
      habitNames: ['Morning Run', 'Drink Water'],
      remainingCount: 2,
    })

    assert.equal(result.success, true)
  })

  test('sendCheerNotification handles friend cheer', async () => {
    const result = await sendCheerNotification('user-456', {
      senderName: 'Alex',
      cheerType: 'fire',
      message: 'Keep going!',
    })

    assert.equal(result.success, true)
  })

  test('sendChallengeNotification handles challenge invite', async () => {
    const result = await sendChallengeNotification('user-789', {
      creatorName: 'Bernice',
      title: '10k Steps',
      targetDays: 7,
    })

    assert.equal(result.success, true)
  })
})

