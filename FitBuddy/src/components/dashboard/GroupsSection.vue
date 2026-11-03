<!--
  Habit Groups section on the Home page (replaces Active Challenges).
  Shows the user's habit groups, today's group activity check-in progress,
  one-click check-in for shared activities, and a modal to start a new group.
-->
<template>
  <section class="surface p-4" data-testid="home-groups">
    <div class="section-head">
      <div>
        <h2 class="section-title">Habit groups</h2>
        <div class="text-muted small">Check in together with friends and build group streaks</div>
      </div>
      <RouterLink to="/groups" class="btn btn-sm btn-link text-decoration-none px-0 flex-shrink-0">
        All groups <i class="bi bi-arrow-right" aria-hidden="true"></i>
      </RouterLink>
    </div>

    <div v-if="loading" class="d-grid gap-3">
      <div v-for="n in 2" :key="n" class="skeleton" style="height: 72px"></div>
    </div>

    <template v-else>
      <p v-if="groups.length === 0" class="text-muted mb-3" data-testid="groups-empty">
        No habit groups yet. Create a group with your friends to track shared activities together.
      </p>

      <ul v-else class="duels divided list-unstyled mb-3 stagger">
        <li v-for="g in groups" :key="g.id" class="duel" data-testid="group-card">
          <div class="duel-head">
            <div class="min-w-0">
              <h3 class="duel-title">{{ g.name }}</h3>
              <div class="duel-meta">
                {{ g.members?.length || 1 }} {{ (g.members?.length || 1) === 1 ? 'member' : 'members' }}
                · {{ g.totalPoints || 0 }} pts
                <template v-if="g.rank"> · Rank #{{ g.rank }}</template>
              </div>
            </div>
            <RouterLink to="/groups" class="btn btn-sm btn-tinted px-3 flex-shrink-0">
              View group
            </RouterLink>
          </div>

          <div v-if="!g.activities || g.activities.length === 0" class="text-muted small mt-1">
            No shared activities yet. <RouterLink to="/groups">Add an activity</RouterLink> to start earning group points.
          </div>

          <div v-else class="d-grid gap-2 mt-2">
            <div
              v-for="a in g.activities"
              :key="a.id"
              class="activity-item"
              data-testid="group-activity-row"
            >
              <div class="d-flex justify-content-between align-items-center gap-2 mb-1">
                <div class="min-w-0">
                  <span class="fw-semibold small">{{ a.title }}</span>
                  <span class="text-muted small ms-1">
                    · <span class="text-capitalize">{{ a.category }}</span> · +{{ a.pointsPerDay }} pts
                  </span>
                </div>
                <button
                  type="button"
                  class="btn btn-sm px-2 py-0 flex-shrink-0"
                  :class="a.myCheckedInToday ? 'btn-outline-success' : 'btn-primary'"
                  :disabled="a.myCheckedInToday || busyActivityId === a.id"
                  data-testid="group-checkin-btn"
                  @click="checkInActivity(a)"
                >
                  <i
                    class="bi me-1"
                    :class="a.myCheckedInToday ? 'bi-check2-circle' : 'bi-check2'"
                    aria-hidden="true"
                  ></i>
                  {{ a.myCheckedInToday ? 'Done' : 'Check in' }}
                </button>
              </div>

              <div class="racer">
                <span class="racer-name text-muted">Today's check-ins</span>
                <span class="track">
                  <span
                    :style="{
                      transform: `scaleX(${share(a.checkedInCount, a.participants?.length || 1)})`,
                      background: a.myCheckedInToday ? 'var(--fb-teal)' : 'var(--fb-accent)',
                    }"
                  ></span>
                </span>
                <span class="racer-score display-num">
                  {{ a.checkedInCount || 0 }}/{{ a.participants?.length || 1 }}
                </span>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <div class="d-flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-outline-primary px-3"
          data-testid="new-group-btn"
          @click="openCreateModal"
        >
          <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>New group
        </button>
        <RouterLink to="/groups" class="btn btn-outline-secondary px-3">
          Open groups
        </RouterLink>
      </div>
    </template>

    <p v-if="error" class="text-danger small mt-3 mb-0" role="alert">{{ error }}</p>

    <!-- Create group modal -->
    <AppModal v-if="showCreateModal" title="New habit group" @close="showCreateModal = false">
      <form id="home-group-form" @submit.prevent="submitCreateGroup">
        <div class="mb-3">
          <label class="form-label small fw-semibold" for="home-grp-name">Group name</label>
          <input
            id="home-grp-name"
            v-model="newGroup.name"
            type="text"
            class="form-control"
            maxlength="80"
            placeholder="e.g. Morning Runners"
            required
          />
        </div>
        <div class="mb-2">
          <div class="form-label small fw-semibold">Invite friends</div>
          <p v-if="friendsLoaded && friends.length === 0" class="text-muted small mb-0">
            You have no friends to add yet. You can still create the group and add friends later from the
            <RouterLink to="/friends">Friends page</RouterLink>.
          </p>
          <div v-else class="d-grid gap-1">
            <label
              v-for="f in friends"
              :key="f.userId"
              class="friend-Option d-flex align-items-center gap-2 p-2 rounded"
            >
              <input v-model="newGroup.memberIds" type="checkbox" class="form-check-input m-0" :value="f.userId" />
              <span>{{ f.displayName }}</span>
            </label>
          </div>
        </div>
        <p v-if="createError" class="text-danger small mt-2 mb-0" role="alert">{{ createError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary px-3" @click="showCreateModal = false">Cancel</button>
        <button type="submit" form="home-group-form" class="btn btn-primary px-4" :disabled="submitting">
          {{ submitting ? 'Creating…' : 'Create group' }}
        </button>
      </template>
    </AppModal>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppModal from '../habits/AppModal.vue'
import { groupService } from '../../services/groupService'
import { friendService } from '../../services/friendService'
import { errorMessage } from '../../services/habitService'
import { celebrate } from '../../utils/celebrate'

const emit = defineEmits(['checked-in'])

const groups = ref([])
const friends = ref([])
const friendsLoaded = ref(false)
const loading = ref(true)
const error = ref('')
const createError = ref('')
const busyActivityId = ref(null)
const showCreateModal = ref(false)
const submitting = ref(false)

const newGroup = ref({
  name: '',
  memberIds: [],
})

const share = (count, total) => (total > 0 ? Math.min(1, (count || 0) / total) : 0)

async function loadGroups() {
  try {
    const data = await groupService.list()
    groups.value = data.groups || []
  } catch (err) {
    console.warn('Failed to load groups on Home:', err)
  } finally {
    loading.value = false
  }
}

async function loadFriends() {
  try {
    const data = await friendService.list()
    friends.value = data.friends || []
    friendsLoaded.value = true
  } catch (err) {
    console.warn('Failed to load friends:', err)
  }
}

function openCreateModal() {
  newGroup.value = { name: '', memberIds: [] }
  createError.value = ''
  showCreateModal.value = true
}

async function submitCreateGroup() {
  submitting.value = true
  createError.value = ''
  try {
    await groupService.create(newGroup.value)
    celebrate()
    showCreateModal.value = false
    await loadGroups()
  } catch (err) {
    createError.value = errorMessage(err)
  } finally {
    submitting.value = false
  }
}

async function checkInActivity(activity) {
  busyActivityId.value = activity.id
  error.value = ''
  try {
    await groupService.checkIn(activity.id)
    celebrate()
    await loadGroups()
    emit('checked-in')
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    busyActivityId.value = null
  }
}

onMounted(() => Promise.all([loadGroups(), loadFriends()]))
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.duel {
  padding: var(--s-4) 0;
}
.duel:first-child {
  padding-top: 0;
}
.duel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
  margin-bottom: var(--s-2);
}
.duel-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
}
.duel-meta {
  font-size: 0.8rem;
  color: var(--fb-text-2);
}
.activity-item {
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-md);
  background: var(--fb-surface-2);
}
.racer {
  display: grid;
  grid-template-columns: minmax(0, 115px) 1fr auto;
  align-items: center;
  gap: var(--s-3);
}
.racer-name {
  font-size: 0.78rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.racer-score {
  font-size: 0.92rem;
  min-width: 2.2rem;
  text-align: right;
}
.track {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: var(--fb-hairline);
  overflow: hidden;
}
.track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  transform-origin: left;
  transition: transform 600ms var(--ease-out);
}
.friend-Option:hover {
  background: rgba(0, 0, 0, 0.04);
}
@media (prefers-reduced-motion: reduce) {
  .track span { transition: none; }
}
</style>

