// Unit tests for utils/challenges.js — run with `npm test` from the server folder.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { roleIn, canRespond, canDelete, canLogProgress, visibleTo } from '../utils/challenges.js'

const ch = (status) => ({ id: 1, creator_id: '1', opponent_id: 'rival_alex', status })

describe('roleIn', () => {
  test('creator, opponent or nobody', () => {
    assert.equal(roleIn(ch('active'), '1'), 'creator')
    assert.equal(roleIn(ch('active'), 'rival_alex'), 'opponent')
    assert.equal(roleIn(ch('active'), 'someone_else'), null)
  })

  test('compares ids as strings, so 1 and "1" are the same person', () => {
    assert.equal(roleIn(ch('active'), 1), 'creator')
    assert.equal(roleIn({ creator_id: 1, opponent_id: 2 }, '2'), 'opponent')
  })
})

describe('canRespond', () => {
  test('only the opponent, only while pending', () => {
    assert.equal(canRespond(ch('pending'), 'rival_alex'), true)
    assert.equal(canRespond(ch('pending'), '1'), false)
    assert.equal(canRespond(ch('pending'), 'someone_else'), false)
  })

  test('not once answered or finished', () => {
    for (const s of ['active', 'declined', 'completed']) {
      assert.equal(canRespond(ch(s), 'rival_alex'), false)
    }
  })
})

describe('canDelete', () => {
  test('creator can cancel pending or dismiss declined', () => {
    assert.equal(canDelete(ch('pending'), '1'), true)
    assert.equal(canDelete(ch('declined'), 1), true)
  })

  test('active and completed cannot be deleted', () => {
    assert.equal(canDelete(ch('active'), '1'), false)
    assert.equal(canDelete(ch('completed'), '1'), false)
  })

  test('nobody but the creator can delete', () => {
    assert.equal(canDelete(ch('pending'), 'rival_alex'), false)
    assert.equal(canDelete(ch('declined'), 'rival_alex'), false)
    assert.equal(canDelete(ch('pending'), 'someone_else'), false)
  })
})

describe('canLogProgress', () => {
  test('both participants while active', () => {
    assert.equal(canLogProgress(ch('active'), '1'), true)
    assert.equal(canLogProgress(ch('active'), 'rival_alex'), true)
  })

  test('not while pending, declined or completed', () => {
    for (const s of ['pending', 'declined', 'completed']) {
      assert.equal(canLogProgress(ch(s), '1'), false)
    }
  })

  test('not for non-participants', () => {
    assert.equal(canLogProgress(ch('active'), 'someone_else'), false)
  })
})

describe('visibleTo', () => {
  test('participants see pending, active and completed', () => {
    for (const s of ['pending', 'active', 'completed']) {
      assert.equal(visibleTo(ch(s), '1'), true)
      assert.equal(visibleTo(ch(s), 'rival_alex'), true)
    }
  })

  test('the creator still sees a declined challenge, the decliner does not', () => {
    assert.equal(visibleTo(ch('declined'), '1'), true)
    assert.equal(visibleTo(ch('declined'), 'rival_alex'), false)
  })

  test('outsiders see nothing', () => {
    assert.equal(visibleTo(ch('active'), 'someone_else'), false)
  })
})
