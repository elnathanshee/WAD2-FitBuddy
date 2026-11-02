<!--
  One line in the full ranking: rank, avatar, name (+ badges), points, and the
  Cheer / Nudge / Add friend buttons (not shown on your own row).
  Props: entry (leaderboard entry), rank (number), scope ('global' | 'friends'),
         sendingKey (which button is waiting for the server, e.g. "7-cheer").
  Emits: 'cheer' with the type ('cheer' | 'nudge'), and 'friend-action'.
-->
<template>
  <li class="lb-row" :class="{ 'is-me': entry.isCurrentUser }" data-testid="leaderboard-row" :data-user-id="entry.userId">
    <span class="lb-rank display-num" :class="`rank-${rank}`">{{ rank }}</span>

    <span class="avatar" :style="{ width: '40px', height: '40px', backgroundColor: entry.avatarColor, fontSize: '16px' }">
      {{ entry.displayName.charAt(0).toUpperCase() }}
    </span>

    <div class="lb-info">
      <div class="lb-name">
        <RouterLink
          v-if="isFriend"
          :to="`/friends/${entry.userId}`"
          class="lb-friend-link"
          data-testid="leaderboard-friend-link"
        >{{ entry.displayName }}</RouterLink>
        <template v-else>{{ entry.displayName }}</template>
        <!-- Soft badge so friends stand out on the Global tab (every row on the Friends tab is a friend) -->
        <span
          v-if="scope === 'global' && isFriend"
          class="badge rounded-pill bg-primary-subtle text-primary-emphasis border border-primary-subtle"
          data-testid="friend-badge"
        >
          <i class="bi bi-people-fill me-1" aria-hidden="true"></i>Friend
        </span>
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
        :class="[`cheer-btn-${action.type}`, { sent: isSent(action.type) }]"
        :disabled="isSent(action.type) || sendingKey === `${entry.userId}-${action.type}`"
        :title="isSent(action.type) ? 'Available again tomorrow' : action.title"
        :data-testid="`${action.type}-btn`"
        @click="emit('cheer', action.type)"
      >
        <!-- Beyond WAD2 syllabus: Transition cross-fades the label between "Cheer" and "Cheered"
             (v-if swaps the two spans, and a CSS animation cannot play on the one that leaves). -->
        <Transition name="morph" mode="out-in">
          <span v-if="isSent(action.type)" key="sent">
            <i class="bi bi-check2" aria-hidden="true"></i> {{ action.doneLabel }}
          </span>
          <span v-else key="ready"><i class="bi" :class="action.icon" aria-hidden="true"></i> {{ action.label }}</span>
        </Transition>
      </button>

      <!-- Add friend / Accept / Requested (nothing if the server doesn't report a status) -->
      <button
        v-if="friendButton"
        type="button"
        class="btn btn-sm cheer-btn friend-btn"
        :disabled="entry.friendStatus === 'outgoing' || sendingKey === `${entry.userId}-friend`"
        :aria-label="friendButton.label"
        :title="friendButton.label"
        data-testid="add-friend-btn"
        @click="emit('friend-action')"
      >
        <i class="bi me-sm-1" :class="friendButton.icon" aria-hidden="true"></i>
        <span class="d-none d-sm-inline">{{ friendButton.label }}</span>
      </button>
    </div>
  </li>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entry: { type: Object, required: true },
  rank: { type: Number, required: true },
  scope: { type: String, default: 'global' },
  sendingKey: { type: String, default: null },
})
const emit = defineEmits(['cheer', 'friend-action'])

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

const isFriend = computed(() => props.entry.friendStatus === 'friends')
const friendButton = computed(() => FRIEND_BUTTONS[props.entry.friendStatus])

// Has today's cheer (or nudge) already been sent to this athlete?
function isSent(type) {
  return Boolean(props.entry.sentToday?.[type])
}
</script>

<style scoped>
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
html[data-theme='dark'] .cheer-btn-cheer:not(:disabled):hover {
  background: rgba(229, 142, 136, 0.14);
  border-color: var(--fb-rose);
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
  .lb-actions .cheer-btn:not(.friend-btn) {
    flex: 1;
  }
}
</style>
