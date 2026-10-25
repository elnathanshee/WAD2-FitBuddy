// Friend helpers: pure functions with no database access, so
// tests/friends.test.js can check every rule with plain objects.
//
// A friendships row looks like { id, requester_id, addressee_id, status }.
// status is 'pending' (a request waiting for an answer) or 'accepted'.

const MAX_SEARCH_LENGTH = 60

// How the current user relates to the person on the other side of a row.
//   'none'     no row at all
//   'friends'  the request was accepted
//   'outgoing' I asked, they haven't answered
//   'incoming' they asked, I haven't answered
export function relationFor(row, me) {
  if (!row) return 'none'
  if (row.status === 'accepted') return 'friends'
  return String(row.requester_id) === String(me) ? 'outgoing' : 'incoming'
}

// The id on the other side of the row from `me`
export function otherUserId(row, me) {
  return String(row.requester_id) === String(me) ? row.addressee_id : row.requester_id
}

// Turns what the user typed into an ILIKE pattern. \ % and _ are escaped so
// they match themselves instead of acting as wildcards.
// ('  Al_x ') → { text: 'Al_x', pattern: '%Al\_x%' }; null if under 2 characters.
export function normaliseSearch(q) {
  if (typeof q !== 'string') return null
  const text = q.trim().slice(0, MAX_SEARCH_LENGTH).trim()
  if (text.length < 2) return null
  const escaped = text.replace(/[\\%_]/g, '\\$&')
  return { text, pattern: `%${escaped}%` }
}
