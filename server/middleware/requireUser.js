// PLACEHOLDER until real authentication lands (Elnathan's scope).
// The frontend's mock login stores a user with an id; src/services/api.js sends
// that id in the "x-user-id" header. Replace this with JWT verification later —
// the rest of the habit code only relies on req.userId being set.
export function requireUser(req, res, next) {
  const userId = req.get('x-user-id')
  if (!userId) {
    return res.status(401).json({ message: 'Missing x-user-id header (are you logged in?)' })
  }
  req.userId = userId
  next()
}
