import api from './api'

export const gamificationService = {
  /** Demo helper: list users so we can switch between them without login. */
  listUsers() {
    return api.get('/users').then((r) => r.data.data)
  },

  /** The current user's habits, each with streak info and today's status. */
  listHabits() {
    return api.get('/habits').then((r) => r.data.data)
  },

  /** Check in a habit. Returns the points awarded and the new streak. */
  checkIn(habitId) {
    return api.post('/checkins', { habitId }).then((r) => r.data.data)
  },

  /** This week's leaderboard, ranked by points earned since Monday. */
  weeklyLeaderboard() {
    return api.get('/leaderboard/weekly').then((r) => r.data.data)
  },
}
