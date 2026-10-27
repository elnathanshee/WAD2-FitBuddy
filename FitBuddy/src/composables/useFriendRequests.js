// Number of friend requests waiting for the current user. Shared by the navbar
// badge and the Friends page, so both stay in step without extra requests.
import { ref } from 'vue'
import { friendService } from '../services/friendService'

// Shared across every component that uses it
const incomingCount = ref(0)

async function refreshFriendRequests() {
  try {
    const data = await friendService.list()
    incomingCount.value = (data.incoming || []).length
  } catch (err) {
    console.warn('Failed to load friend requests:', err)
  }
}

function setIncomingCount(n) {
  incomingCount.value = n
}

export function useFriendRequests() {
  return { incomingCount, refreshFriendRequests, setIncomingCount }
}
