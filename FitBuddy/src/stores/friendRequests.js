// Friend-request store: how many friend requests are waiting for the current
// user. Used by the Navbar badge, the Friends page and the Leaderboard so they
// all show the same number without extra requests.
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { friendService } from '../services/friendService'

export const useFriendRequestsStore = defineStore('friendRequests', () => {
  const incomingCount = ref(0)

  // Ask the server for the latest number of pending requests
  async function refreshFriendRequests() {
    try {
      const data = await friendService.list()
      incomingCount.value = (data.incoming || []).length
    } catch (err) {
      console.warn('Failed to load friend requests:', err)
    }
  }

  // Set the count directly when a page already has the list (saves a request)
  function setIncomingCount(n) {
    incomingCount.value = n
  }

  return { incomingCount, refreshFriendRequests, setIncomingCount }
})
