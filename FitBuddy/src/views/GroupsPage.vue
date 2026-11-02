<template>
  <div class="container py-4 py-md-5" style="max-width: 940px">
    <header class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
      <div><h1 class="page-title">Habit groups</h1><p class="page-subtitle">Build habits together and see how your group ranks.</p></div>
      <button class="btn btn-sm btn-tinted px-3" :disabled="loading" @click="load"><i class="bi bi-arrow-clockwise me-1" :class="{ spin: loading }"></i>Refresh</button>
    </header>
    <div v-if="notice" class="alert" :class="noticeError ? 'alert-danger' : 'alert-success'" role="status">{{ notice }}</div>
    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <section class="surface p-3 p-md-4 mb-4">
      <h2 class="section-title mb-1">Start a group</h2>
      <p class="text-muted small">Choose a name and invite friends you’ve already connected with.</p>
      <form class="row g-3" @submit.prevent="createGroup">
        <div class="col-md-5"><label class="form-label" for="group-name">Group name</label><input id="group-name" v-model="newGroupName" class="form-control" maxlength="60" placeholder="Morning movers" required /></div>
        <div class="col-md-7"><label class="form-label">Choose friends</label>
          <div v-if="friends.length" class="friend-picker">
            <label v-for="friend in friends" :key="friend.userId" class="friend-option"><input v-model="selectedFriends" type="checkbox" :value="friend.userId" /><span class="avatar" :style="{ backgroundColor: friend.avatarColor }">{{ friend.displayName.charAt(0).toUpperCase() }}</span>{{ friend.displayName }}</label>
          </div>
          <p v-else class="small text-muted mb-0">Add friends on the <RouterLink to="/friends">Friends page</RouterLink> to start a group.</p>
        </div>
        <div class="col-12"><button class="btn btn-primary" :disabled="creating || selectedFriends.length === 0"><i class="bi bi-people me-1"></i>{{ creating ? 'Creating…' : 'Create group' }}</button></div>
      </form>
    </section>

    <div v-if="loading && !loaded" class="d-grid gap-3" aria-busy="true"><div class="skeleton" style="height: 180px"></div><div class="skeleton" style="height: 260px"></div></div>
    <div v-else-if="loaded && groups.length === 0" class="surface text-center py-5"><i class="bi bi-people d-block mb-2 text-muted" style="font-size: 2rem"></i><p class="mb-0">Your groups will show here. Create one with your friends to get started.</p></div>

    <div class="d-grid gap-4">
      <section v-for="group in groups" :key="group.id" class="surface p-3 p-md-4 group-card">
        <header class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
          <div><h2 class="section-title mb-1"><i class="bi bi-people-fill me-2 text-success"></i>{{ group.name }}</h2><div class="small text-muted">{{ group.members.length }} members</div></div>
          <span class="badge rounded-pill text-bg-light">Group leaderboard</span>
        </header>
        <div class="member-strip mb-4"><span v-for="member in group.members" :key="member.userId" class="member-chip"><span class="avatar" :style="{ backgroundColor: member.avatarColor }">{{ member.displayName.charAt(0).toUpperCase() }}</span>{{ member.displayName }}<span v-if="member.userId === group.ownerId" class="text-muted">· admin</span></span></div>

        <details class="activity-create surface-soft p-3 mb-4">
          <summary class="fw-semibold"><i class="bi bi-plus-circle me-2"></i>Create a group activity</summary>
          <form class="row g-2 mt-2" @submit.prevent="addActivity(group)">
            <div class="col-md-4"><label class="form-label small" :for="`activity-title-${group.id}`">Activity</label><input :id="`activity-title-${group.id}`" v-model="activityForms[group.id].title" class="form-control form-control-sm" placeholder="Daily walk" maxlength="80" required /></div>
            <div class="col-6 col-md-2"><label class="form-label small">Starts</label><input v-model="activityForms[group.id].startDate" type="date" class="form-control form-control-sm" required @change="syncSuggestedEndDate(group.id)" /></div>
            <div class="col-6 col-md-2"><label class="form-label small">Ends</label><input v-model="activityForms[group.id].endDate" type="date" class="form-control form-control-sm" required @input="markEndDateEdited(group.id)" /></div>
            <div class="col-6 col-md-2"><label class="form-label small">Points each day</label><input v-model.number="activityForms[group.id].points" type="number" min="1" max="1000" class="form-control form-control-sm" required /></div>
            <div class="col-6 col-md-2 d-flex align-items-end"><button class="btn btn-sm btn-primary w-100" :disabled="busy || activityForms[group.id].memberIds.length === 0">Add activity</button></div>
            <div class="col-12">
              <div class="small fw-semibold mb-1">Participants</div>
              <p class="small text-muted mb-2">The whole group is selected by default. Adjust who’s taking part in this activity.</p>
              <div class="member-strip">
                <label v-for="member in group.members" :key="member.userId" class="member-chip checkin-member">
                  <input v-model="activityForms[group.id].memberIds" type="checkbox" :value="member.userId" />
                  <span class="avatar" :style="{ backgroundColor: member.avatarColor }">{{ member.displayName.charAt(0).toUpperCase() }}</span>{{ member.displayName }}
                </label>
              </div>
            </div>
          </form>
          <p class="small text-muted mb-0 mt-2">Each selected participant gets the same points for a check-in. They can check in once per day during the activity.</p>
        </details>

        <div v-if="group.activities.length" class="d-grid gap-3 mb-4">
          <article v-for="activity in group.activities" :key="activity.id" class="activity-card">
            <div class="d-flex justify-content-between gap-3 flex-wrap">
              <div><h3 class="h6 fw-bold mb-1">{{ activity.title }}</h3><div class="small text-muted">{{ dateLabel(activity.startDate) }} – {{ dateLabel(activity.endDate) }} · {{ activity.points }} points per member, per day</div></div>
              <div class="d-flex align-items-start gap-2">
                <span v-if="activity.checkedInToday" class="badge text-bg-success">You checked in today</span>
                <button v-if="activity.createdBy === currentUserId || group.ownerId === currentUserId" type="button" class="btn btn-sm btn-outline-danger" :aria-label="`Delete ${activity.title}`" @click="deletingActivity = { group, activity }"><i class="bi bi-trash" aria-hidden="true"></i><span class="visually-hidden">Delete activity</span></button>
              </div>
            </div>
            <div class="small text-muted mt-2">Participants: {{ activity.participants.map((member) => member.displayName).join(', ') }}</div>
            <div class="d-flex flex-wrap align-items-center gap-2 mt-2"><span class="badge rounded-pill text-bg-light"><i class="bi bi-check2-all me-1"></i>{{ activity.checkedInCount || 0 }}/{{ activity.participants.length }} checked in today</span><span class="badge rounded-pill text-bg-light"><i class="bi bi-heart-fill text-danger me-1"></i>{{ activity.cheerCount || 0 }} cheers today</span></div>
            <div v-if="activeToday(activity) && activity.participants.some((member) => member.userId !== currentUserId)" class="d-flex gap-2 mt-2"><select v-model="cheerTargets[activity.id]" class="form-select form-select-sm" :aria-label="`Choose someone to encourage for ${activity.title}`"><option value="">Encourage a teammate…</option><option v-for="member in activity.participants.filter((item) => item.userId !== currentUserId)" :key="member.userId" :value="member.userId">{{ member.displayName }}</option></select><button type="button" class="btn btn-sm btn-outline-success text-nowrap" :disabled="busy || !cheerTargets[activity.id]" @click="sendCheer(activity)"><i class="bi bi-heart me-1"></i>Send cheer</button></div>
            <div v-if="!activity.checkedInToday && activeToday(activity) && isParticipant(activity)" class="checkin-box mt-3">
              <div class="small fw-semibold mb-1">Participants checking in today</div>
              <div class="small text-muted mb-2">Everyone in this activity is selected by default. Uncheck anyone who didn’t participate today.</div>
              <div class="member-strip mb-2"><label v-for="member in activity.participants" :key="member.userId" class="member-chip checkin-member"><input v-model="selectedForActivity[activity.id]" type="checkbox" :value="member.userId" :disabled="member.userId === currentUserId" /><span class="avatar" :style="{ backgroundColor: member.avatarColor }">{{ member.displayName.charAt(0).toUpperCase() }}</span>{{ member.displayName }}<span v-if="member.userId === currentUserId" class="text-muted">(you)</span></label></div>
              <button class="btn btn-sm btn-tinted" :disabled="busy || !(selectedForActivity[activity.id] || []).length" @click="checkIn(activity)"><i class="bi bi-check2-circle me-1"></i>Check in {{ (selectedForActivity[activity.id] || []).length }} {{ (selectedForActivity[activity.id] || []).length === 1 ? 'member' : 'members' }}</button>
            </div>
            <div v-else-if="!activity.checkedInToday && activeToday(activity) && !isParticipant(activity)" class="small text-muted mt-2">You aren’t selected for this activity.</div>
            <div v-else-if="!activity.checkedInToday" class="small text-muted mt-2">Check-ins are available during the activity dates.</div>
          </article>
        </div>
        <div v-else class="text-muted small mb-4">No activities yet. Create one above to start your group challenge.</div>

        <div class="eyebrow mb-2">Points leaderboard</div>
        <ol class="group-ranking list-unstyled mb-0">
          <li v-for="entry in group.leaderboard" :key="entry.userId" class="ranking-row" :class="{ 'ranking-me': entry.isCurrentUser }">
            <span class="ranking-place">{{ entry.rank }}</span><span class="avatar" :style="{ backgroundColor: entry.avatarColor }">{{ entry.displayName.charAt(0).toUpperCase() }}</span><span class="ranking-name">{{ entry.displayName }} <span v-if="entry.isCurrentUser" class="badge rounded-pill text-bg-success">You</span><small class="d-block text-muted">{{ entry.activities }} {{ entry.activities === 1 ? 'group activity' : 'group activities' }}</small></span><strong>{{ entry.points }} <small>pts</small></strong>
          </li>
        </ol>
      </section>
    </div>

    <AppModal v-if="deletingActivity" :title="`Delete ${deletingActivity.activity.title}?`" size="sm" @close="deletingActivity = null">
      <p class="mb-0">This removes the activity, its check-ins, and the points it added to the group leaderboard.</p>
      <template #footer>
        <button type="button" class="btn btn-light" @click="deletingActivity = null">Cancel</button>
        <button type="button" class="btn btn-danger" :disabled="busy" @click="removeActivity">Delete activity</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { friendService } from '../services/friendService'
import { groupService } from '../services/groupService'
import { errorMessage } from '../services/habitService'
import { toDateKey } from '../utils/dates'
import AppModal from '../components/habits/AppModal.vue'

const groups = ref([]), friends = ref([]), selectedFriends = ref([]), newGroupName = ref('')
const activityForms = ref({}), selectedForActivity = ref({}), cheerTargets = ref({})
const deletingActivity = ref(null)
const loading = ref(false), loaded = ref(false), creating = ref(false), busy = ref(false)
const error = ref(''), notice = ref(''), noticeError = ref(false)
const auth = useAuthStore()
const currentUserId = String(auth.user?.id ?? '')

function makeActivityForm(group) { const today = toDateKey(); return { title: '', startDate: today, endDate: today, endDateEdited: false, points: 10, memberIds: group.members.map(member => member.userId) } }
function setupForms() {
  for (const group of groups.value) {
    if (!activityForms.value[group.id]) activityForms.value[group.id] = makeActivityForm(group)
    for (const activity of group.activities) {
      if (!selectedForActivity.value[activity.id]) selectedForActivity.value[activity.id] = activity.participants.map(member => member.userId)
    }
  }
}
async function load() {
  loading.value = true; error.value = ''
  try {
    const [groupData, friendData] = await Promise.all([groupService.list(), friendService.list()])
    groups.value = groupData.groups; friends.value = friendData.friends; setupForms(); loaded.value = true
  } catch (err) { error.value = errorMessage(err) } finally { loading.value = false }
}
function showNotice(message, isError = false) { notice.value = message; noticeError.value = isError; setTimeout(() => { notice.value = '' }, 4000) }
async function createGroup() {
  creating.value = true
  try { const result = await groupService.create(newGroupName.value, selectedFriends.value); newGroupName.value = ''; selectedFriends.value = []; showNotice(result.message); await load() }
  catch (err) { showNotice(errorMessage(err), true) } finally { creating.value = false }
}
async function addActivity(group) {
  busy.value = true
  try { const { endDateEdited, ...activity } = activityForms.value[group.id]; const result = await groupService.createActivity(group.id, activity); showNotice(result.message); activityForms.value[group.id] = makeActivityForm(group); await load() }
  catch (err) { showNotice(errorMessage(err), true) } finally { busy.value = false }
}
async function checkIn(activity) {
  busy.value = true
  try { const result = await groupService.checkIn(activity.id, selectedForActivity.value[activity.id]); showNotice(result.message); await load() }
  catch (err) { showNotice(errorMessage(err), true) } finally { busy.value = false }
}
async function sendCheer(activity) {
  busy.value = true
  try { const result = await groupService.cheer(activity.id, cheerTargets.value[activity.id]); cheerTargets.value[activity.id] = ''; showNotice(result.message); await load() }
  catch (err) { showNotice(errorMessage(err), true) } finally { busy.value = false }
}
async function removeActivity() {
  if (!deletingActivity.value) return
  busy.value = true
  try {
    const { group, activity } = deletingActivity.value
    const result = await groupService.deleteActivity(group.id, activity.id)
    deletingActivity.value = null
    showNotice(result.message)
    await load()
  } catch (err) { showNotice(errorMessage(err), true) } finally { busy.value = false }
}
function dateLabel(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }
function activeToday(activity) { const today = toDateKey(); return today >= activity.startDate && today <= activity.endDate }
function isParticipant(activity) { return activity.participants.some(member => member.userId === currentUserId) }
function syncSuggestedEndDate(groupId) { const form = activityForms.value[groupId]; if (form && !form.endDateEdited) form.endDate = form.startDate }
function markEndDateEdited(groupId) { if (activityForms.value[groupId]) activityForms.value[groupId].endDateEdited = true }
onMounted(load)
</script>

<style scoped>
.spin { display: inline-block; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.friend-picker, .member-strip { display: flex; flex-wrap: wrap; gap: .55rem; }
.friend-picker { max-height: 150px; overflow: auto; padding: .25rem; }
.friend-option, .member-chip { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid var(--fb-hairline); border-radius: 999px; padding: .35rem .6rem; font-size: .82rem; background: var(--fb-surface); }
.friend-option input, .checkin-member input { accent-color: var(--fb-green-700); }
.avatar { width: 27px; height: 27px; flex: 0 0 27px; font-size: 12px; }
.surface-soft { background: var(--fb-bg); border-radius: var(--r-md); }
.activity-create summary { cursor: pointer; list-style: none; }
.activity-create summary::-webkit-details-marker { display: none; }
.activity-card { padding: .9rem 1rem; border: 1px solid var(--fb-hairline); border-radius: var(--r-md); }
.checkin-box { padding-top: .7rem; border-top: 1px solid var(--fb-hairline); }
.checkin-member { cursor: pointer; }
.ranking-row { display: grid; grid-template-columns: 28px 36px minmax(0, 1fr) auto; align-items: center; gap: .7rem; padding: .65rem .75rem; border-radius: var(--r-md); }
.ranking-me { background: var(--fb-green-50); }
.ranking-place { text-align: center; font-family: var(--font-display); font-size: 1.25rem; color: var(--fb-text-2); }
.ranking-name { font-weight: 650; }
.ranking-row > strong { color: var(--fb-green-700); white-space: nowrap; }
.ranking-row > strong small { color: var(--fb-text-2); font-size: .72rem; }
@media (max-width: 520px) { .ranking-row { grid-template-columns: 24px 32px minmax(0, 1fr) auto; gap: .45rem; padding-inline: .35rem; font-size: .88rem; } }
</style>
