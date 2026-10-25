// Unit tests for utils/friends.js — run with `npm test` from the server folder.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { relationFor, otherUserId, normaliseSearch } from '../utils/friends.js'

const row = (requester, addressee, status = 'pending') => ({
  id: 1,
  requester_id: requester,
  addressee_id: addressee,
  status,
})

describe('relationFor', () => {
  test('no row → none', () => {
    assert.equal(relationFor(null, '1'), 'none')
    assert.equal(relationFor(undefined, '1'), 'none')
  })

  test('accepted → friends, whichever side asked', () => {
    assert.equal(relationFor(row('1', 'rival_alex', 'accepted'), '1'), 'friends')
    assert.equal(relationFor(row('rival_alex', '1', 'accepted'), '1'), 'friends')
  })

  test('pending → outgoing if I asked, incoming if they asked', () => {
    assert.equal(relationFor(row('1', 'rival_alex'), '1'), 'outgoing')
    assert.equal(relationFor(row('rival_alex', '1'), '1'), 'incoming')
  })

  test('compares ids as strings, so 1 and "1" are the same person', () => {
    assert.equal(relationFor(row('1', 'rival_alex'), 1), 'outgoing')
    assert.equal(relationFor(row(1, 'rival_alex'), '1'), 'outgoing')
    assert.equal(relationFor(row('rival_alex', 1), '1'), 'incoming')
  })
})

describe('otherUserId', () => {
  test('returns the id on the other side, in both directions', () => {
    assert.equal(otherUserId(row('1', 'rival_alex'), '1'), 'rival_alex')
    assert.equal(otherUserId(row('rival_alex', '1'), '1'), 'rival_alex')
  })

  test('works with a number for me', () => {
    assert.equal(otherUserId(row('1', 'rival_alex'), 1), 'rival_alex')
  })
})

describe('normaliseSearch', () => {
  test('trims the text and wraps it in % for ILIKE', () => {
    assert.deepEqual(normaliseSearch('  David '), { text: 'David', pattern: '%David%' })
  })

  test('rejects fewer than 2 characters, even with spaces around', () => {
    assert.equal(normaliseSearch(''), null)
    assert.equal(normaliseSearch('a'), null)
    assert.equal(normaliseSearch('  a  '), null)
  })

  test('rejects anything that is not a string', () => {
    assert.equal(normaliseSearch(undefined), null)
    assert.equal(normaliseSearch(42), null)
    assert.equal(normaliseSearch(['da', 'vid']), null)
  })

  test('escapes % _ and \\ so they are not wildcards', () => {
    assert.equal(normaliseSearch('50%').pattern, '%50\\%%')
    assert.equal(normaliseSearch('a_b').pattern, '%a\\_b%')
    assert.equal(normaliseSearch('a\\b').pattern, '%a\\\\b%')
  })

  test('caps the text at 60 characters', () => {
    const result = normaliseSearch('x'.repeat(100))
    assert.equal(result.text.length, 60)
  })
})
