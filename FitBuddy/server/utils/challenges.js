// Challenge helpers: pure functions with no database access, so
// tests/challenges.test.js can check every rule with plain objects.
//
// A challenges row looks like { id, creator_id, opponent_id, status }.
// status goes 'pending' → 'active' (accepted) → 'completed',
// or 'pending' → 'declined'.

// Which side of the duel the user is on
export function roleIn(ch, userId) {
  if (String(ch.creator_id) === String(userId)) return 'creator'
  if (String(ch.opponent_id) === String(userId)) return 'opponent'
  return null
}

// Only the invited friend can accept or decline, and only while pending
export function canRespond(ch, userId) {
  return ch.status === 'pending' && roleIn(ch, userId) === 'opponent'
}

// The creator can cancel a pending invite or dismiss a declined one
export function canDelete(ch, userId) {
  return roleIn(ch, userId) === 'creator' && (ch.status === 'pending' || ch.status === 'declined')
}

// Both athletes can log days once the duel is accepted and not yet finished
export function canLogProgress(ch, userId) {
  return ch.status === 'active' && roleIn(ch, userId) !== null
}

// A participant sees the challenge, except the opponent who declined it
export function visibleTo(ch, userId) {
  const role = roleIn(ch, userId)
  if (role === null) return false
  return !(ch.status === 'declined' && role === 'opponent')
}
