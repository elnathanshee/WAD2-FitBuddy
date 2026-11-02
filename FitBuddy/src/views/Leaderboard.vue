<!--
  Weekly leaderboard: points from habit check-ins, a podium for the top 3,
  and cheers/nudges. Two tabs: Global (everyone) and Friends (you + your
  friends, ranked again among themselves). Each cheer type can be sent to a person once per day
  (enforced by the server; `sentToday` tells the UI which buttons to lock).
  This page loads the data and handles the actions; the pieces are child components
  in components/leaderboard/ (toast, points card, podium, cheers inbox, ranking row).
-->
<template>
  <div class="container py-4 py-md-5" style="max-width: 880px;">
    <header class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
      <div>
        <h1 class="page-title">Leaderboard</h1>
        <p class="page-subtitle">{{ weekLabel || 'This week' }} · resets every Monday</p>
      </div>
      <button type="button" class="btn btn-sm btn-tinted px-3" :disabled="loading" @click="load">
        <i class="bi bi-arrow-clockwise me-1" :class="{ spin: loading }" aria-hidden="true"></i>Refresh
      </button>
    </header>

    <LeaderboardToast :toast="toast" />

    <div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>{{ error }}
    </div>

    <div v-if="loading && !board" class="d-grid gap-3" aria-busy="true">
      <div class="skeleton" style="height: 120px"></div>
      <div class="skeleton" style="height: 220px"></div>
      <div class="skeleton" style="height: 260px"></div>
    </div>

    <div v-else-if="board" class="d-grid gap-4">
      <!-- Global / Friends -->
      <div class="segmented" role="tablist" aria-label="Leaderboard scope" :style="{ '--index': thumbIndex }">
        <span class="segmented-thumb" aria-hidden="true"></span>
        <button
          v-for="option in SCOPE_OPTIONS"
          :key="option.value"
          type="button"
          role="tab"
          class="segment"
          :class="{ active: scope === option.value }"
          :aria-selected="scope === option.value"
          :data-testid="`lb-tab-${option.value}`"
          @click="scope = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <MyPointsCard v-if="me" :me="me" />

      <LeaderboardPodium v-if="podium.length === 3" :entries="podium" :ranks="ranks" />

      <CheersInbox v-if="recentCheers.length" :cheers="recentCheers" />

      <!-- Full ranking -->
      <section class="surface p-2 p-md-3">
        <p v-if="scope === 'global' && board.entries.length === 0" class="text-muted text-center mb-0 py-4">
          Nobody has any habits yet. Add one and check in to get on the board.
        </p>

        <ol class="list-unstyled mb-0 stagger">
          <LeaderboardRow
            v-for="entry in visibleEntries"
            :key="entry.userId"
            :entry="entry"
            :rank="rankOf(entry)"
            :scope="scope"
            :sending-key="sendingKey"
            @cheer="(type) => cheerAthlete(entry, type)"
            @friend-action="friendAction(entry)"
          />
        </ol>

        <!-- Hint when the Friends tab has nobody but me -->
        <p v-if="showFriendsHint" class="text-muted small text-center mb-0 py-3" data-testid="lb-friends-empty">
          Add friends to compete with them here.
          <RouterLink to="/friends">Find friends</RouterLink>
        </p>
      </section>

      <p class="text-muted small text-center mb-0">
        Points come from completed habit check-ins. You can send each friend one cheer and one nudge a day.
        Tap a friend's name to see their progress.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { leaderboardService } from '../services/leaderboardService'
import { friendService } from '../services/friendService'
import { useFriendRequestsStore } from '../stores/friendRequests'
import { errorMessage } from '../services/habitService'
import { toDateKey, fromDateKey } from '../utils/dates'
import { celebrate } from '../utils/celebrate'
import LeaderboardToast from '../components/leaderboard/LeaderboardToast.vue'
import MyPointsCard from '../components/leaderboard/MyPointsCard.vue'
import LeaderboardPodium from '../components/leaderboard/LeaderboardPodium.vue'
import CheersInbox from '../components/leaderboard/CheersInbox.vue'
import LeaderboardRow from '../components/leaderboard/LeaderboardRow.vue'

const friendRequests = useFriendRequestsStore()

const board = ref(null)
const me = ref(null)
const recentCheers = ref([])
const loading = ref(false)
const error = ref('')
const toast = ref(null) // { text, kind: 'success' | 'info' }
const sendingKey = ref(null)

// The two tabs; the page opens on Global
const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'friends', label: 'Friends' },
]
const scope = ref('global')

// Which position (0 or 1) the sliding thumb of the tab switch sits at
const thumbIndex = computed(() => (scope.value === 'friends' ? 1 : 0))

// The entries shown in the current tab. These are the original objects (not
// copies) because cheering / friend actions update them in place.
const visibleEntries = computed(() => {
  const entries = board.value?.entries ?? []
  return scope.value === 'friends'
    ? entries.filter((e) => e.isCurrentUser || e.friendStatus === 'friends')
    : entries
})

// Rank within the visible list: ties share a rank, like the server does
const ranks = computed(() => {
  const map = new Map()
  let prev = null
  visibleEntries.value.forEach((e, i) => {
    if (prev === null || e.points !== prev.points) map.set(e.userId, i + 1)
    else map.set(e.userId, map.get(prev.userId))
    prev = e
  })
  return map
})
// Rank shown for an entry in the current tab
const rankOf = (entry) => ranks.value.get(entry.userId)

// Podium order is 2nd, 1st, 3rd so the winner stands in the middle.
// Only shown when the top three have distinct ranks (no ties).
const podium = computed(() => {
  const top = visibleEntries.value.slice(0, 3)
  if (top.length < 3 || new Set(top.map(rankOf)).size < 3) return []
  return [top[1], top[0], top[2]]
})

// The Friends tab only has my own row: point to the Find friends page
const showFriendsHint = computed(() => scope.value === 'friends' && visibleEntries.value.length <= 1)

const weekLabel = computed(() => {
  if (!board.value) return ''
  const fmt = (key) =>
    fromDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${fmt(board.value.weekStart)} – ${fmt(board.value.weekEnd)}`
})

// Shows the toast for 3.5 seconds (a new toast restarts the timer)
let toastTimer = null
function showToast(text, kind = 'success') {
  toast.value = { text, kind }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 3500)
}

async function load() {
  loading.value = true
  error.value = ''
  const today = toDateKey()
  try {
    const [weekly, mine, cheersData] = await Promise.all([
      leaderboardService.weekly(today),
      leaderboardService.myScore(today),
      leaderboardService.getCheers().catch(() => ({ cheers: [] })),
    ])
    board.value = weekly
    me.value = mine
    recentCheers.value = cheersData?.cheers || []
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

// Remembers that today's cheer/nudge was sent, so its button stays locked
function markSent(athlete, type) {
  athlete.sentToday = { ...(athlete.sentToday || {}), [type]: true }
}

async function cheerAthlete(athlete, type) {
  if (athlete.sentToday?.[type]) return
  sendingKey.value = `${athlete.userId}-${type}`
  try {
    await leaderboardService.sendCheer(athlete.userId, type)
    celebrate()
    const label = type === 'cheer' ? 'cheered' : 'nudged'
    showToast(`You ${label} ${athlete.displayName}!`)
    athlete.cheersCount = (athlete.cheersCount || 0) + 1
    markSent(athlete, type)
  } catch (err) {
    if (err.response?.status === 409) {
      // Already sent today (e.g. from another tab): lock the button too
      markSent(athlete, type)
      showToast(err.response.data?.message || 'Already sent today. Try again tomorrow!', 'info')
    } else {
      error.value = err.response?.data?.message || 'Failed to send cheer.'
    }
  } finally {
    sendingKey.value = null
  }
}

async function friendAction(athlete) {
  sendingKey.value = `${athlete.userId}-friend`
  try {
    const data =
      athlete.friendStatus === 'incoming'
        ? await friendService.accept(athlete.friendRequestId)
        : await friendService.sendRequest(athlete.userId)
    athlete.friendStatus = data.relation
    athlete.friendRequestId = data.requestId ?? athlete.friendRequestId
    showToast(data.message)
    // Accepting a request changes the navbar badge
    friendRequests.refreshFriendRequests()
  } catch (err) {
    showToast(errorMessage(err), 'info')
  } finally {
    sendingKey.value = null
  }
}

onMounted(load)

// Beyond WAD2 syllabus: onUnmounted stops the toast timer when the user leaves the page;
// otherwise it would still fire after this page is gone.
onUnmounted(() => clearTimeout(toastTimer))
</script>

<style scoped>
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Segmented control: one thumb slides under the selected segment */
.segmented {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  padding: var(--s-1);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  max-width: 280px;
}
.segmented-thumb {
  position: absolute;
  top: var(--s-1);
  bottom: var(--s-1);
  left: var(--s-1);
  width: calc((100% - 2 * var(--s-1)) / 2);
  border-radius: 8px;
  background: var(--fb-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateX(calc(var(--index) * 100%));
  transition: transform 240ms var(--ease-in-out);
}
.segment {
  position: relative;
  z-index: 1;
  border: 0;
  background: transparent;
  padding: var(--s-2) var(--s-4);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--fb-text-2);
  border-radius: 8px;
  transition: color 150ms ease;
}
.segment.active {
  color: var(--fb-text);
}
</style>
