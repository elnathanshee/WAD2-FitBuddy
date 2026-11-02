// Unit tests for utils/friends.js — run with `npm test` from the server folder.
import { describe, it, expect } from 'vitest'
import { relationFor, otherUserId, normaliseSearch } from '../utils/friends.js'

const row = (requester, addressee, status = 'pending') => ({
  id: 1,
  requester_id: requester,
  addressee_id: addressee,
  status,
})

describe('relationFor', () => {
  it('no row → none', () => {
    expect(relationFor(null, '1')).toBe('none')
    expect(relationFor(undefined, '1')).toBe('none')
  })

  it('accepted → friends, whichever side asked', () => {
    expect(relationFor(row('1', 'rival_alex', 'accepted'), '1')).toBe('friends')
    expect(relationFor(row('rival_alex', '1', 'accepted'), '1')).toBe('friends')
  })

  it('pending → outgoing if I asked, incoming if they asked', () => {
    expect(relationFor(row('1', 'rival_alex'), '1')).toBe('outgoing')
    expect(relationFor(row('rival_alex', '1'), '1')).toBe('incoming')
  })

  it('compares ids as strings, so 1 and "1" are the same person', () => {
    expect(relationFor(row('1', 'rival_alex'), 1)).toBe('outgoing')
    expect(relationFor(row(1, 'rival_alex'), '1')).toBe('outgoing')
    expect(relationFor(row('rival_alex', 1), '1')).toBe('incoming')
  })
})

describe('otherUserId', () => {
  it('returns the id on the other side, in both directions', () => {
    expect(otherUserId(row('1', 'rival_alex'), '1')).toBe('rival_alex')
    expect(otherUserId(row('rival_alex', '1'), '1')).toBe('rival_alex')
  })

  it('works with a number for me', () => {
    expect(otherUserId(row('1', 'rival_alex'), 1)).toBe('rival_alex')
  })
})

describe('normaliseSearch', () => {
  it('trims the text and wraps it in % for ILIKE', () => {
    expect(normaliseSearch('  David ')).toEqual({ text: 'David', pattern: '%David%' })
  })

  it('rejects fewer than 2 characters, even with spaces around', () => {
    expect(normaliseSearch('')).toBe(null)
    expect(normaliseSearch('a')).toBe(null)
    expect(normaliseSearch('  a  ')).toBe(null)
  })

  it('rejects anything that is not a string', () => {
    expect(normaliseSearch(undefined)).toBe(null)
    expect(normaliseSearch(42)).toBe(null)
    expect(normaliseSearch(['da', 'vid'])).toBe(null)
  })

  it('escapes % _ and \\ so they are not wildcards', () => {
    expect(normaliseSearch('50%').pattern).toBe('%50\\%%')
    expect(normaliseSearch('a_b').pattern).toBe('%a\\_b%')
    expect(normaliseSearch('a\\b').pattern).toBe('%a\\\\b%')
  })

  it('caps the text at 60 characters', () => {
    const result = normaliseSearch('x'.repeat(100))
    expect(result.text).toHaveLength(60)
  })
})
