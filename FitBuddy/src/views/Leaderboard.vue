<!--
  Weekly leaderboard: points from habit check-ins, a podium for the top 3,
  and cheers/nudges. Two tabs: Global (everyone) and Friends (you + your
  friends, ranked again among themselves). Each cheer type can be sent to a person once per day
  (enforced by the server; `sentToday` tells the UI which buttons to lock).
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

    <!-- Toast: drops in from the top and leaves the same way -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" class="lb-toast" :class="`lb-toast-${toast.kind}`" role="status" data-testid="leaderboard-toast">
          <i class="bi" :class="toast.kind === 'info' ? 'bi-clock-history' : 'bi-megaphone-fill'" aria-hidden="true"></i>
          {{ toast.text }}
        </div>
      </Transition>
    </Teleport>

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
      <div class="segmented" role="tablist" aria-label="Leaderboard scope" :style="{ '--index': scope === 'friends' ? 1 : 0 }">
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

      <!-- Your points -->
      <section v-if="me" class="surface my-points p-4">
        <Trophy3D class="my-trophy" />
        <div class="flex-grow-1">
          <div class="eyebrow">Your points this week</div>
          <div class="points-big display-num"><CountUp :value="me.total" /><span class="pts"> pts</span></div>
        </div>
        <ul class="breakdown list-unstyled mb-0">
          <li><i class="bi bi-check-circle-fill text-success" aria-hidden="true"></i><strong>{{ me.completions }}</strong> completions × {{ me.rules.COMPLETION }}</li>
          <li><i class="bi bi-calendar-check-fill" style="color: var(--fb-blue)" aria-hidden="true"></i><strong>{{ me.allDailyDays }}</strong> perfect days × {{ me.rules.ALL_DAILY }}</li>
          <li><i class="bi bi-fire" style="color: var(--fb-amber)" aria-hidden="true"></i><strong>{{ me.milestones }}</strong> 7-day milestones × {{ me.rules.STREAK_MILESTONE }}</li>
        </ul>
      </section>

      <!-- Podium (top 3) -->
      <section v-if="podium.length === 3" class="podium" aria-label="Top three">
        <div
          v-for="entry in podium"
          :key="entry.userId"
          v-tilt
          class="podium-spot"
          :class="`place-${rankOf(entry)}`"
        >
          <span class="avatar podium-avatar" :style="{ backgroundColor: entry.avatarColor }">
            {{ entry.displayName.charAt(0).toUpperCase() }}
          </span>
          <div class="podium-name">{{ entry.displayName }}</div>
          <div class="podium-points">{{ entry.points }} pts</div>
          <div class="podium-step display-num" aria-hidden="true">{{ rankOf(entry) }}</div>
        </div>
      </section>

      <!-- Cheers received -->
      <section v-if="recentCheers.length" v-reveal class="surface p-3 px-md-4">
        <h2 class="section-title mb-2">Cheers for you</h2>
        <ul class="cheers-list divided list-unstyled mb-0">
          <li v-for="ch in recentCheers" :key="ch.id">
            <span class="avatar" :style="{ width: '24px', height: '24px', fontSize: '11px', backgroundColor: ch.sender_color || '#4F46E5' }">
              {{ (ch.sender_name || '?').charAt(0) }}
            </span>
            <span><strong>{{ ch.sender_name }}</strong> {{ CHEER_TEXT[ch.type] || 'boosted you' }}</span>
          </li>
        </ul>
      </section>

      <!-- Full ranking -->
      <section class="surface p-2 p-md-3">
        <p v-if="scope === 'global' && board.entries.length === 0" class="text-muted text-center mb-0 py-4">
          Nobody has any habits yet. Add one and check in to get on the board.
        </p>

        <ol class="list-unstyled mb-0 stagger">
          <li
            v-for="entry in visibleEntries"
            :key="entry.userId"
            class="lb-row"
            :class="{ 'is-me': entry.isCurrentUser }"
            data-testid="leaderboard-row"
            :data-user-id="entry.userId"
          >
            <span class="lb-rank display-num" :class="`rank-${rankOf(entry)}`">{{ rankOf(entry) }}</span>

            <span class="avatar" :style="{ width: '40px', height: '40px', backgroundColor: entry.avatarColor, fontSize: '16px' }">
              {{ entry.displayName.charAt(0).toUpperCase() }}
            </span>

            <div class="lb-info">
              <div class="lb-name">
                <RouterLink
                  v-if="entry.friendStatus === 'friends'"
                  :to="`/friends/${entry.userId}`"
                  class="lb-friend-link"
                  data-testid="leaderboard-friend-link"
                >{{ entry.displayName }}</RouterLink>
                <template v-else>{{ entry.displayName }}</template>
                <span v-if="entry.isCurrentUser" class="badge rounded-pill text-bg-primary">You</span>
                <span v-if="entry.cheersCount > 0" class="cheer-count" :title="`${entry.cheersCount} cheers received`">
                  <i class="bi bi-heart-fill" aria-hidden="true"></i>{{ entry.cheersCount }}
                </span>
              </div>
              <div class="lb-sub">
                {{ entry.breakdown.completions }} completed
                <span v-if="entry.breakdown.milestones > 0">· {{ entry.breakdown.milestones }} streak milestone{{ entry.breakdown.milestones > 1 ? 's' : '' }}</span>
              </div>
            </div>

            <div class="lb-points display-num">
              {{ entry.points }}<small>pts</small>
            </div>

            <!-- Cheer / Nudge: each once per person per day -->
            <div v-if="!entry.isCurrentUser" class="lb-actions">
              <button
                v-for="action in ACTIONS"
                :key="action.type"
                type="button"
                class="btn btn-sm cheer-btn"
                :class="[`cheer-btn-${action.type}`, { sent: entry.sentToday?.[action.type] }]"
                :disabled="entry.sentToday?.[action.type] || sendingKey === `${entry.userId}-${action.type}`"
                :title="entry.sentToday?.[action.type] ? 'Available again tomorrow' : action.title"
                :data-testid="`${action.type}-btn`"
                @click="cheerAthlete(entry, action.type)"
              >
                <Transition name="morph" mode="out-in">
                  <span v-if="entry.sentToday?.[action.type]" key="sent">
                    <i class="bi bi-check2" aria-hidden="true"></i> {{ action.doneLabel }}
                  </span>
                  <span v-else key="ready"><i class="bi" :class="action.icon" aria-hidden="true"></i> {{ action.label }}</span>
                </Transition>
              </button>

              <!-- Add friend / Accept / Requested (nothing if the server doesn't report a status) -->
              <button
                v-if="FRIEND_BUTTONS[entry.friendStatus]"
                type="button"
                class="btn btn-sm cheer-btn friend-btn"
                :disabled="entry.friendStatus === 'outgoing' || sendingKey === `${entry.userId}-friend`"
                :aria-label="FRIEND_BUTTONS[entry.friendStatus].label"
                :title="FRIEND_BUTTONS[entry.friendStatus].label"
                data-testid="add-friend-btn"
                @click="friendAction(entry)"
              >
                <i class="bi me-sm-1" :class="FRIEND_BUTTONS[entry.friendStatus].icon" aria-hidden="true"></i>
                <span class="d-none d-sm-inline">{{ FRIEND_BUTTONS[entry.friendStatus].label }}</span>
              </button>
            </div>
          </li>
        </ol>

        <!-- Hint when the Friends tab has nobody but me -->
        <p v-if="scope === 'friends' && visibleEntries.length <= 1" class="text-muted small text-center mb-0 py-3" data-testid="lb-friends-empty">
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
import { useFriendRequests } from '../composables/useFriendRequests'
import { errorMessage } from '../services/habitService'
import { toDateKey, fromDateKey } from '../utils/dates'
import { celebrate } from '../utils/celebrate'
import CountUp from '../components/CountUp.vue'
import Trophy3D from '../components/three/Trophy3D.vue'

const { refreshFriendRequests } = useFriendRequests()

const board = ref(null)
const me = ref(null)
const recentCheers = ref([])
const loading = ref(false)
const error = ref('')
const toast = ref(null) // { text, kind: 'success' | 'info' }
const sendingKey = ref(null)

const ACTIONS = [
  { type: 'cheer', icon: 'bi-heart', label: 'Cheer', doneLabel: 'Cheered', title: 'Cheer on this athlete!' },
  { type: 'nudge', icon: 'bi-bell', label: 'Nudge', doneLabel: 'Nudged', title: 'Send a friendly nudge!' },
]
// The friend button for each friendStatus ('friends' and 'self' have none)
const FRIEND_BUTTONS = {
  none: { icon: 'bi-person-plus', label: 'Add friend' },
  incoming: { icon: 'bi-person-check', label: 'Accept' },
  outgoing: { icon: 'bi-hourglass-split', label: 'Requested' },
}
const CHEER_TEXT = { cheer: 'cheered you on', nudge: 'nudged you', fire: 'sent you a boost', celebrate: 'celebrated you' }

// The two tabs; the page opens on Global
const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'friends', label: 'Friends' },
]
const scope = ref('global')

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

let toastTimer = null
function showToast(text, kind = 'success') {
  toast.value = { text, kind }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 3500)
}

const weekLabel = computed(() => {
  if (!board.value) return ''
  const fmt = (key) =>
    fromDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${fmt(board.value.weekStart)} – ${fmt(board.value.weekEnd)}`
})

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
    refreshFriendRequests()
  } catch (err) {
    showToast(errorMessage(err), 'info')
  } finally {
    sendingKey.value = null
  }
}

onMounted(load)
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

/* Your points */
.my-points {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-4) var(--s-6);
}
.my-trophy {
  margin: calc(var(--s-4) * -1) 0;
}
.points-big {
  font-size: 4rem;
  color: var(--fb-green-700);
  margin-top: var(--s-1);
}
.points-big .pts {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: var(--fb-text-2);
}
.breakdown {
  display: grid;
  gap: var(--s-1);
  font-size: 0.85rem;
  color: var(--fb-text-2);
}
.breakdown i {
  margin-right: var(--s-2);
}
.breakdown strong {
  color: var(--fb-text);
}

/* Podium */
.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: end;
  gap: var(--s-3);
}
.podium-spot {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
  animation: rise-up 480ms var(--ease-out) backwards;
}
.place-1 { animation-delay: 80ms; }
.place-3 { animation-delay: 160ms; }
@keyframes rise-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.podium-avatar {
  width: 56px;
  height: 56px;
  font-size: 1.3rem;
  box-shadow: 0 0 0 3px var(--fb-bg);
}
.place-1 .podium-avatar {
  width: 68px;
  height: 68px;
  font-size: 1.5rem;
}
.podium-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-md);
  margin-top: var(--s-2);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.podium-points {
  font-size: 0.8rem;
  color: var(--fb-text-2);
  font-weight: 600;
  margin-bottom: var(--s-2);
}
.podium-step {
  width: 100%;
  border-radius: var(--r-md) var(--r-md) 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--s-3);
  font-size: 2.2rem;
  color: var(--fb-text-2);
  background: var(--fb-surface);
  border: 1px solid var(--fb-hairline);
  border-bottom: 0;
}
.place-1 .podium-step {
  height: 112px;
  color: #f5f3ee;
  background: var(--fb-green-700);
  border-color: var(--fb-green-700);
}
.place-2 .podium-step {
  height: 84px;
}
.place-3 .podium-step {
  height: 64px;
}

/* Cheers received */
.cheers-list li {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) 0;
  font-size: 0.9rem;
}

/* Ranking rows */
.lb-row {
  display: grid;
  grid-template-columns: 32px 40px minmax(0, 1fr) auto;
  grid-template-areas:
    'rank avatar info points'
    '.    .      actions actions';
  align-items: center;
  column-gap: var(--s-3);
  row-gap: var(--s-2);
  padding: var(--s-3);
  border-radius: var(--r-md);
}
.lb-row + .lb-row {
  margin-top: 2px;
}
.lb-row.is-me {
  background: var(--fb-green-50);
  box-shadow: inset 0 0 0 1px var(--fb-green-200);
}
.lb-rank {
  grid-area: rank;
  text-align: center;
  color: var(--fb-text-3);
  font-size: 1.5rem;
}
.lb-rank.rank-1 {
  color: var(--fb-green-700);
}
.lb-row > .avatar {
  grid-area: avatar;
}
.lb-info {
  grid-area: info;
  min-width: 0;
}
.lb-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-2);
  font-weight: 700;
}
.lb-friend-link {
  color: inherit;
  text-decoration: none;
}
.lb-friend-link:hover {
  color: inherit;
  text-decoration: underline;
}
.lb-sub {
  font-size: 0.8rem;
  color: var(--fb-text-2);
}
.cheer-count {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--fb-rose);
}
.lb-points {
  grid-area: points;
  text-align: right;
  font-size: 1.7rem;
}
.lb-points small {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--fb-text-2);
  margin-left: 2px;
}
.lb-actions {
  grid-area: actions;
  display: flex;
  gap: var(--s-2);
}

@media (min-width: 768px) {
  .lb-row {
    grid-template-columns: 32px 40px minmax(0, 1fr) auto 72px;
    grid-template-areas: 'rank avatar info actions points';
  }
}

.cheer-btn {
  min-width: 96px;
  min-height: 36px;
  font-size: 0.82rem;
  padding: var(--s-1) var(--s-3);
  border: 1px solid var(--fb-hairline);
  background: var(--fb-surface);
}
.cheer-btn-cheer:not(:disabled):hover {
  background: #fbeeed;
  border-color: #e8b5b1;
}
.cheer-btn-nudge:not(:disabled):hover {
  background: var(--fb-green-50);
  border-color: var(--fb-green-200);
}
.cheer-btn.sent,
.cheer-btn.sent:disabled {
  opacity: 1;
  color: var(--fb-green-700);
  background: var(--fb-green-50);
  border-color: transparent;
}
.morph-enter-active,
.morph-leave-active {
  transition: opacity 140ms ease, filter 140ms ease;
}
.morph-enter-from,
.morph-leave-to {
  opacity: 0;
  filter: blur(2px);
}

/* Toast */
.lb-toast {
  position: fixed;
  top: calc(var(--fb-nav-h) + 12px);
  left: 50%;
  z-index: 1060;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  max-width: calc(100vw - 32px);
  padding: var(--s-3) var(--s-4);
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: rgba(28, 27, 24, 0.94);
  box-shadow: var(--fb-shadow-lg);
  transform: translateX(-50%);
}
.lb-toast-success i {
  color: var(--fb-green-400);
}
.lb-toast-info i {
  color: var(--fb-yellow);
}
.toast-enter-active {
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
}
.toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-from,
  .toast-leave-to {
    transform: translateX(-50%);
  }
}

@media (max-width: 575.98px) {
  /* Three buttons share the row on phones: shrink the cheer/nudge minimum, keep the friend button icon-sized */
  .lb-actions .cheer-btn {
    min-width: 0;
    padding: var(--s-1) var(--s-2);
    white-space: nowrap;
  }
  .lb-actions .friend-btn {
    flex: 0 0 auto;
    min-width: 44px;
  }
  .podium {
    gap: var(--s-2);
  }
  .podium-avatar {
    width: 44px;
    height: 44px;
    font-size: 1.1rem;
  }
  .place-1 .podium-avatar {
    width: 54px;
    height: 54px;
  }
  .lb-actions .cheer-btn:not(.friend-btn) {
    flex: 1;
  }
}
</style>
