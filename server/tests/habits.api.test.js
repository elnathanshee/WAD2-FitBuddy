// API tests for /api/habits — run with `npm test` from the server folder.
// They use an in-memory MongoDB (mongodb-memory-server), so no Atlas cluster is
// needed. The first run downloads a MongoDB binary, which can take a minute.
import { describe, test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Habit from '../models/Habit.js'
import CheckIn from '../models/CheckIn.js'
import { toDateKey, addDays, weekStart } from '../utils/dates.js'

const ALICE = { 'x-user-id': 'alice' }
const BOB = { 'x-user-id': 'bob' }
const TODAY = toDateKey()

let mongo

before(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
  await CheckIn.syncIndexes() // make sure the unique {habitId, date} index exists
})

after(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})

beforeEach(async () => {
  await Habit.deleteMany({})
  await CheckIn.deleteMany({})
})

function createHabit(body = {}, headers = ALICE) {
  return request(app)
    .post('/api/habits')
    .set(headers)
    .send({ name: 'Drink water', target: { amount: 3, unit: 'glasses' }, ...body })
}

function checkIn(habitId, body, headers = ALICE) {
  return request(app).post(`/api/habits/${habitId}/checkins`).set(headers).send(body)
}

describe('auth placeholder', () => {
  test('no x-user-id header → 401', async () => {
    const res = await request(app).get('/api/habits')
    assert.equal(res.status, 401)
  })
})

describe('POST /api/habits', () => {
  test('creates a habit owned by the requesting user → 201', async () => {
    const res = await createHabit({ category: 'water' })
    assert.equal(res.status, 201)
    assert.equal(res.body.name, 'Drink water')
    assert.equal(res.body.userId, 'alice')
    assert.deepEqual(res.body.target, { amount: 3, unit: 'glasses' })
    assert.equal(res.body.frequency, 'daily') // schema default
  })

  test('ignores userId and _id sent in the body', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await createHabit({ userId: 'bob', _id: fakeId })
    assert.equal(res.status, 201)
    assert.equal(res.body.userId, 'alice')
    assert.notEqual(res.body._id, fakeId)
  })

  test('empty name → 400 with a readable message', async () => {
    const res = await createHabit({ name: '  ' })
    assert.equal(res.status, 400)
    assert.match(res.body.message, /Habit name is required/)
  })

  test('accepts a custom category, an emoji icon and a decimal target', async () => {
    const res = await createHabit({ category: 'Meditation', icon: '🧘‍♀️', target: { amount: 2.555, unit: 'km' } })
    assert.equal(res.status, 201)
    assert.equal(res.body.category, 'Meditation')
    assert.equal(res.body.icon, '🧘‍♀️')
    assert.equal(res.body.target.amount, 2.56) // rounded to 2 decimal places
  })

  test('new habits default to the ✅ emoji', async () => {
    const res = await createHabit()
    assert.equal(res.body.icon, '✅')
  })

  test('bad frequency, category, icon and target → 400', async () => {
    assert.equal((await createHabit({ frequency: 'hourly' })).status, 400)
    assert.equal((await createHabit({ category: 'x'.repeat(31) })).status, 400)
    assert.equal((await createHabit({ icon: 'not an emoji at all' })).status, 400)
    assert.equal((await createHabit({ target: { amount: 0 } })).status, 400)
    assert.equal((await createHabit({ target: { amount: 'lots' } })).status, 400)
  })

  test('malformed JSON → 400', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(ALICE)
      .set('Content-Type', 'application/json')
      .send('{"name": ')
    assert.equal(res.status, 400)
  })
})

describe('GET /api/habits', () => {
  test("lists only the user's own habits, newest first", async () => {
    await createHabit({ name: 'First' })
    await createHabit({ name: 'Second' })
    await createHabit({ name: "Bob's" }, BOB)

    const res = await request(app).get('/api/habits').set(ALICE)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.map((h) => h.name), ['Second', 'First'])
  })

  test("includes each habit's todayCount and streak", async () => {
    const { body: water } = await createHabit({ name: 'Water' }) // target 3
    const { body: run } = await createHabit({ name: 'Run', target: { amount: 1 } })
    await checkIn(water._id, { date: TODAY, count: 2 }) // partial: 2 / 3
    await checkIn(run._id, { date: addDays(TODAY, -2) })
    await checkIn(run._id, { date: addDays(TODAY, -1) })

    const res = await request(app).get(`/api/habits?today=${TODAY}`).set(ALICE)
    const byName = Object.fromEntries(res.body.map((h) => [h.name, h]))
    assert.equal(byName.Water.todayCount, 2)
    assert.deepEqual(byName.Water.streak, { current: 0, longest: 0 })
    assert.equal(byName.Run.todayCount, 0)
    assert.deepEqual(byName.Run.streak, { current: 2, longest: 2 }) // grace rule
  })

  test('invalid today → 400', async () => {
    const res = await request(app).get('/api/habits?today=nope').set(ALICE)
    assert.equal(res.status, 400)
  })
})

describe('GET /api/habits/:id', () => {
  test('returns the habit → 200', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).get(`/api/habits/${habit._id}`).set(ALICE)
    assert.equal(res.status, 200)
    assert.equal(res.body._id, habit._id)
  })

  test("another user's habit → 404", async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).get(`/api/habits/${habit._id}`).set(BOB)
    assert.equal(res.status, 404)
  })

  test('invalid or unknown id → 404, not 500', async () => {
    assert.equal((await request(app).get('/api/habits/not-an-id').set(ALICE)).status, 404)
    const unknown = new mongoose.Types.ObjectId()
    assert.equal((await request(app).get(`/api/habits/${unknown}`).set(ALICE)).status, 404)
  })
})

describe('PUT /api/habits/:id', () => {
  test('updates the given fields → 200', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app)
      .put(`/api/habits/${habit._id}`)
      .set(ALICE)
      .send({ name: 'Drink more water', target: { amount: 8 } })
    assert.equal(res.status, 200)
    assert.equal(res.body.name, 'Drink more water')
    assert.deepEqual(res.body.target, { amount: 8, unit: 'glasses' }) // unit kept
  })

  test('cannot change userId', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).put(`/api/habits/${habit._id}`).set(ALICE).send({ userId: 'bob' })
    assert.equal(res.status, 200)
    assert.equal(res.body.userId, 'alice')
  })

  test('runs validation → 400', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).put(`/api/habits/${habit._id}`).set(ALICE).send({ name: '' })
    assert.equal(res.status, 400)
  })

  test("another user's habit → 404 and unchanged", async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).put(`/api/habits/${habit._id}`).set(BOB).send({ name: 'Hacked' })
    assert.equal(res.status, 404)
    assert.equal((await Habit.findById(habit._id)).name, 'Drink water')
  })
})

describe('DELETE /api/habits/:id', () => {
  test('deletes the habit and its check-ins → 204', async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY })

    const res = await request(app).delete(`/api/habits/${habit._id}`).set(ALICE)
    assert.equal(res.status, 204)
    assert.equal(await Habit.countDocuments(), 0)
    assert.equal(await CheckIn.countDocuments(), 0)
  })

  test("another user's habit → 404 and not deleted", async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).delete(`/api/habits/${habit._id}`).set(BOB)
    assert.equal(res.status, 404)
    assert.equal(await Habit.countDocuments(), 1)
  })
})

describe('POST /api/habits/:id/checkins', () => {
  test('first check-in of the day → 201 with count 1', async () => {
    const { body: habit } = await createHabit()
    const res = await checkIn(habit._id, { date: TODAY })
    assert.equal(res.status, 201)
    assert.equal(res.body.date, TODAY)
    assert.equal(res.body.count, 1)
  })

  test('checking in again the same day adds to the count → 200, one document', async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY })
    const res = await checkIn(habit._id, { date: TODAY, count: 2 })
    assert.equal(res.status, 200)
    assert.equal(res.body.count, 3)
    assert.equal(await CheckIn.countDocuments(), 1)
  })

  test('decimal amounts add up without floating-point errors', async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY, count: 0.1 })
    const res = await checkIn(habit._id, { date: TODAY, count: 0.2 })
    assert.equal(res.status, 200)
    assert.equal(res.body.count, 0.3) // not 0.30000000000000004
  })

  test('invalid date, future date or bad count → 400', async () => {
    const { body: habit } = await createHabit()
    assert.equal((await checkIn(habit._id, {})).status, 400)
    assert.equal((await checkIn(habit._id, { date: '15/10/2026' })).status, 400)
    assert.equal((await checkIn(habit._id, { date: '2026-02-30' })).status, 400)
    assert.equal((await checkIn(habit._id, { date: addDays(TODAY, 5) })).status, 400)
    assert.equal((await checkIn(habit._id, { date: TODAY, count: 0 })).status, 400)
    assert.equal((await checkIn(habit._id, { date: TODAY, count: -2 })).status, 400)
    assert.equal((await checkIn(habit._id, { date: TODAY, count: '5' })).status, 400)
    assert.equal((await checkIn(habit._id, { date: TODAY, count: 0.001 })).status, 400) // rounds to 0
    assert.equal((await checkIn(habit._id, { date: TODAY, count: 100001 })).status, 400)
  })

  test("another user's habit → 404", async () => {
    const { body: habit } = await createHabit()
    assert.equal((await checkIn(habit._id, { date: TODAY }, BOB)).status, 404)
  })
})

describe('PUT /api/habits/:id/checkins/:date', () => {
  const setTotal = (habitId, count, headers = ALICE, date = TODAY) =>
    request(app).put(`/api/habits/${habitId}/checkins/${date}`).set(headers).send({ count })

  test("replaces that day's total → 200", async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY, count: 50 })
    const res = await setTotal(habit._id, 5)
    assert.equal(res.status, 200)
    assert.equal(res.body.count, 5)
    assert.equal(await CheckIn.countDocuments(), 1)
  })

  test('works even if nothing was logged that day yet', async () => {
    const { body: habit } = await createHabit()
    const res = await setTotal(habit._id, 1.25)
    assert.equal(res.status, 200)
    assert.equal(res.body.count, 1.25)
  })

  test("0 removes the day's check-in → 204", async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY })
    assert.equal((await setTotal(habit._id, 0)).status, 204)
    assert.equal(await CheckIn.countDocuments(), 0)
  })

  test('bad total or date → 400', async () => {
    const { body: habit } = await createHabit()
    assert.equal((await setTotal(habit._id, -1)).status, 400)
    assert.equal((await setTotal(habit._id, 'five')).status, 400)
    assert.equal((await setTotal(habit._id, 5, ALICE, addDays(TODAY, 5))).status, 400)
  })

  test("another user's habit → 404", async () => {
    const { body: habit } = await createHabit()
    assert.equal((await setTotal(habit._id, 5, BOB)).status, 404)
  })
})

describe('DELETE /api/habits/:id/checkins/:date', () => {
  test("removes that day's check-in → 204", async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY })
    const res = await request(app).delete(`/api/habits/${habit._id}/checkins/${TODAY}`).set(ALICE)
    assert.equal(res.status, 204)
    assert.equal(await CheckIn.countDocuments(), 0)
  })

  test('no check-in that day → 404', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).delete(`/api/habits/${habit._id}/checkins/${TODAY}`).set(ALICE)
    assert.equal(res.status, 404)
  })

  test("another user's habit → 404 and check-in kept", async () => {
    const { body: habit } = await createHabit()
    await checkIn(habit._id, { date: TODAY })
    const res = await request(app).delete(`/api/habits/${habit._id}/checkins/${TODAY}`).set(BOB)
    assert.equal(res.status, 404)
    assert.equal(await CheckIn.countDocuments(), 1)
  })
})

describe('GET /api/habits/:id/history', () => {
  const T = TODAY

  test('returns check-ins in range with completed flags, and streaks from all history', async () => {
    const { body: habit } = await createHabit({ target: { amount: 2, unit: 'glasses' } })
    // A 5-day completed run long before the range...
    for (let d = 60; d >= 56; d--) await checkIn(habit._id, { date: addDays(T, -d), count: 2 })
    // ...then 2 completed days ending yesterday, and a partial day today.
    await checkIn(habit._id, { date: addDays(T, -2), count: 2 })
    await checkIn(habit._id, { date: addDays(T, -1), count: 2 })
    await checkIn(habit._id, { date: T, count: 1 })

    const res = await request(app).get(`/api/habits/${habit._id}/history?today=${T}`).set(ALICE)
    assert.equal(res.status, 200)
    assert.equal(res.body.habit._id, habit._id)
    assert.deepEqual(res.body.checkIns, [
      { date: addDays(T, -2), count: 2, completed: true },
      { date: addDays(T, -1), count: 2, completed: true },
      { date: T, count: 1, completed: false },
    ])
    assert.deepEqual(res.body.streak, { current: 2, longest: 5 })
  })

  test('honours from/to', async () => {
    const { body: habit } = await createHabit({ target: { amount: 1 } })
    for (const d of [3, 2, 1]) await checkIn(habit._id, { date: addDays(T, -d) })
    const res = await request(app)
      .get(`/api/habits/${habit._id}/history?from=${addDays(T, -2)}&to=${addDays(T, -2)}&today=${T}`)
      .set(ALICE)
    assert.deepEqual(res.body.checkIns.map((c) => c.date), [addDays(T, -2)])
    assert.equal(res.body.streak.current, 3) // streak still uses all history
  })

  test('invalid date query → 400', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).get(`/api/habits/${habit._id}/history?today=yesterday`).set(ALICE)
    assert.equal(res.status, 400)
  })

  test("another user's habit → 404", async () => {
    const { body: habit } = await createHabit()
    assert.equal((await request(app).get(`/api/habits/${habit._id}/history`).set(BOB)).status, 404)
  })
})

describe('weekly habits (target is per Monday–Sunday week)', () => {
  // A fixed Thursday, so "this week" is always Mon 2026-10-05 … Sun 2026-10-11.
  // These check-ins are in the past relative to the real today (2026-10-11 or later).
  const THU = '2026-10-08'
  const MON = weekStart(THU)

  async function weeklyHabit() {
    const { body } = await createHabit({ name: 'Study', frequency: 'weekly', target: { amount: 10, unit: 'hours' } })
    return body
  }

  test('list: periodCount is the whole week\'s total, todayCount just today', async () => {
    const habit = await weeklyHabit()
    await checkIn(habit._id, { date: MON, count: 3 })
    await checkIn(habit._id, { date: THU, count: 2.5 })
    await checkIn(habit._id, { date: addDays(MON, -1), count: 9 }) // last week: doesn't count

    const res = await request(app).get(`/api/habits?today=${THU}`).set(ALICE)
    assert.equal(res.body[0].todayCount, 2.5)
    assert.equal(res.body[0].periodCount, 5.5)
  })

  test('streak counts weeks that hit the target, with the grace rule', async () => {
    const habit = await weeklyHabit()
    // Two earlier weeks complete (10 h each), this week only partly (4 h so far)
    for (const weeksAgo of [2, 1]) await checkIn(habit._id, { date: addDays(MON, -7 * weeksAgo), count: 10 })
    await checkIn(habit._id, { date: MON, count: 4 })

    const res = await request(app).get(`/api/habits?today=${THU}`).set(ALICE)
    assert.deepEqual(res.body[0].streak, { current: 2, longest: 2 })

    // Finishing this week extends it
    await checkIn(habit._id, { date: THU, count: 6 })
    const after = await request(app).get(`/api/habits?today=${THU}`).set(ALICE)
    assert.deepEqual(after.body[0].streak, { current: 3, longest: 3 })
  })

  test('history: week totals, and each day is marked by its week', async () => {
    const habit = await weeklyHabit()
    await checkIn(habit._id, { date: addDays(MON, -7), count: 10 }) // last week: complete
    await checkIn(habit._id, { date: MON, count: 4 }) // this week: 4 / 10

    const res = await request(app)
      .get(`/api/habits/${habit._id}/history?from=${addDays(MON, -7)}&to=${THU}&today=${THU}`)
      .set(ALICE)
    assert.deepEqual(res.body.weeks, [
      { start: addDays(MON, -7), total: 10, completed: true },
      { start: MON, total: 4, completed: false },
    ])
    assert.deepEqual(res.body.checkIns.map((c) => c.completed), [true, false])
  })

  test('daily habits have no weeks in their history', async () => {
    const { body: habit } = await createHabit()
    const res = await request(app).get(`/api/habits/${habit._id}/history`).set(ALICE)
    assert.equal(res.body.weeks, undefined)
  })
})
