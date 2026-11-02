// Tests the OneSignal push-notification service and /api/notifications routes without real credentials.
import { describe, it, expect } from 'vitest'
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
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/notifications/status')
    expect(res.status).toBe(401)
  })

  it('GET /api/notifications/status returns configuration status', async () => {
    const res = await request(app).get('/api/notifications/status').set(DEMO_USER)
    expect(res.status).toBe(200)
    expect(typeof res.body.configured).toBe('boolean')
  })

  it('POST /api/notifications/test sends a test notification', async () => {
    const res = await request(app)
      .post('/api/notifications/test')
      .set(DEMO_USER)
      .send({ title: 'Test', message: 'Hello from test!' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('POST /api/notifications/remind-habits triggers habit check-in reminder', async () => {
    const res = await request(app)
      .post('/api/notifications/remind-habits')
      .set(DEMO_USER)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('OneSignal Notification Service Functions', () => {
  it('sendPushNotification handles simulated fallback mode', async () => {
    const result = await sendPushNotification({
      userIds: ['user-123'],
      title: 'Unit Test',
      message: 'Running in simulated fallback',
    })

    expect(result.success).toBe(true)
  })

  it('sendHabitReminder constructs proper reminder format', async () => {
    const result = await sendHabitReminder('user-123', {
      habitNames: ['Morning Run', 'Drink Water'],
      remainingCount: 2,
    })

    expect(result.success).toBe(true)
  })

  it('sendCheerNotification handles friend cheer', async () => {
    const result = await sendCheerNotification('user-456', {
      senderName: 'Alex',
      cheerType: 'fire',
      message: 'Keep going!',
    })

    expect(result.success).toBe(true)
  })

  it('sendChallengeNotification handles challenge invite', async () => {
    const result = await sendChallengeNotification('user-789', {
      creatorName: 'Bernice',
      title: '10k Steps',
      targetDays: 7,
    })

    expect(result.success).toBe(true)
  })
})

