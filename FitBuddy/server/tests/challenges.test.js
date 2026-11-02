// Unit tests for utils/challenges.js — run with `npm test` from the server folder.
import { describe, it, expect } from 'vitest'
import { roleIn, canRespond, canDelete, canLogProgress, visibleTo } from '../utils/challenges.js'

const ch = (status) => ({ id: 1, creator_id: '1', opponent_id: 'rival_alex', status })

describe('roleIn', () => {
  it('creator, opponent or nobody', () => {
    expect(roleIn(ch('active'), '1')).toBe('creator')
    expect(roleIn(ch('active'), 'rival_alex')).toBe('opponent')
    expect(roleIn(ch('active'), 'someone_else')).toBe(null)
  })

  it('compares ids as strings, so 1 and "1" are the same person', () => {
    expect(roleIn(ch('active'), 1)).toBe('creator')
    expect(roleIn({ creator_id: 1, opponent_id: 2 }, '2')).toBe('opponent')
  })
})

describe('canRespond', () => {
  it('only the opponent, only while pending', () => {
    expect(canRespond(ch('pending'), 'rival_alex')).toBe(true)
    expect(canRespond(ch('pending'), '1')).toBe(false)
    expect(canRespond(ch('pending'), 'someone_else')).toBe(false)
  })

  it('not once answered or finished', () => {
    for (const s of ['active', 'declined', 'completed']) {
      expect(canRespond(ch(s), 'rival_alex')).toBe(false)
    }
  })
})

describe('canDelete', () => {
  it('creator can cancel pending or dismiss declined', () => {
    expect(canDelete(ch('pending'), '1')).toBe(true)
    expect(canDelete(ch('declined'), 1)).toBe(true)
  })

  it('active and completed cannot be deleted', () => {
    expect(canDelete(ch('active'), '1')).toBe(false)
    expect(canDelete(ch('completed'), '1')).toBe(false)
  })

  it('nobody but the creator can delete', () => {
    expect(canDelete(ch('pending'), 'rival_alex')).toBe(false)
    expect(canDelete(ch('declined'), 'rival_alex')).toBe(false)
    expect(canDelete(ch('pending'), 'someone_else')).toBe(false)
  })
})

describe('canLogProgress', () => {
  it('both participants while active', () => {
    expect(canLogProgress(ch('active'), '1')).toBe(true)
    expect(canLogProgress(ch('active'), 'rival_alex')).toBe(true)
  })

  it('not while pending, declined or completed', () => {
    for (const s of ['pending', 'declined', 'completed']) {
      expect(canLogProgress(ch(s), '1')).toBe(false)
    }
  })

  it('not for non-participants', () => {
    expect(canLogProgress(ch('active'), 'someone_else')).toBe(false)
  })
})

describe('visibleTo', () => {
  it('participants see pending, active and completed', () => {
    for (const s of ['pending', 'active', 'completed']) {
      expect(visibleTo(ch(s), '1')).toBe(true)
      expect(visibleTo(ch(s), 'rival_alex')).toBe(true)
    }
  })

  it('the creator still sees a declined challenge, the decliner does not', () => {
    expect(visibleTo(ch('declined'), '1')).toBe(true)
    expect(visibleTo(ch('declined'), 'rival_alex')).toBe(false)
  })

  it('outsiders see nothing', () => {
    expect(visibleTo(ch('active'), 'someone_else')).toBe(false)
  })
})
