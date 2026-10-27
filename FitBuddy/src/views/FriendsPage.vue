<!--
  Friends: search for athletes, answer or cancel friend requests, and see your
  friends. After every action the lists are loaded again (and the last search
  re-run), so what's on screen always matches the server.
-->
<template>
  <div class="container py-4 py-md-5" style="max-width: 880px;">
    <header class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
      <div>
        <h1 class="page-title">Friends</h1>
        <p class="page-subtitle" data-testid="friends-summary">{{ summary }}</p>
      </div>
      <button type="button" class="btn btn-sm btn-tinted px-3" :disabled="loading" @click="refresh">
        <i class="bi bi-arrow-clockwise me-1" :class="{ spin: loading }" aria-hidden="true"></i>Refresh
      </button>
    </header>

    <!-- Toast: drops in from the top -->
    <div v-if="toast" class="fr-toast" :class="`fr-toast-${toast.kind}`" role="status" data-testid="friends-toast">
      <i class="bi" :class="toast.kind === 'info' ? 'bi-info-circle-fill' : 'bi-check-circle-fill'" aria-hidden="true"></i>
      {{ toast.text }}
    </div>

    <div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>{{ error }}
    </div>

    <div v-if="loading && !loaded" class="d-grid gap-3" aria-busy="true">
      <div class="skeleton" style="height: 120px"></div>
      <div class="skeleton" style="height: 200px"></div>
    </div>

    <div v-else-if="loaded" class="d-grid gap-4">
      <!-- Find athletes -->
      <section class="surface p-3 px-md-4" data-testid="friends-search">
        <h2 class="section-title mb-3">Find athletes</h2>
        <form @submit.prevent="runSearch">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
            <input
              v-model="query"
              type="text"
              class="form-control"
              placeholder="Search by name or email"
              aria-label="Search by name or email"
              maxlength="60"
              data-testid="friends-search-input"
            />
            <button type="submit" class="btn btn-primary px-3" :disabled="searching" data-testid="friends-search-btn">
              Search
            </button>
          </div>
        </form>
        <p v-if="searchError" class="text-danger small mt-2 mb-0" data-testid="friends-search-error">{{ searchError }}</p>

        <p v-if="searched && !searchError && results.length === 0" class="text-muted mt-3 mb-0" data-testid="friends-search-empty">
          No athletes match "{{ searchedQuery }}".
        </p>
        <ul v-if="results.length" class="divided list-unstyled mb-0 mt-2" data-testid="friends-results">
          <FriendRow
            v-for="r in results"
            :key="r.userId"
            :user="r"
            :subtitle="RELATION_TEXT[r.relation]"
            :to="r.relation === 'friends' ? `/friends/${r.userId}` : ''"
          >
            <button
              v-if="r.relation === 'none'"
              type="button"
              class="btn btn-sm btn-primary"
              :disabled="busyKey === `${r.userId}-add`"
              data-testid="friend-add-btn"
              @click="run(`${r.userId}-add`, () => friendService.sendRequest(r.userId))"
            >
              <i class="bi bi-person-plus me-1" aria-hidden="true"></i>Add friend
            </button>

            <template v-else-if="r.relation === 'outgoing'">
              <button type="button" class="btn btn-sm btn-tinted" disabled data-testid="friend-requested-btn">
                <i class="bi bi-hourglass-split me-1" aria-hidden="true"></i>Requested
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="busyKey === `${r.userId}-cancel`"
                data-testid="friend-cancel-btn"
                @click="run(`${r.userId}-cancel`, () => friendService.cancel(r.requestId))"
              >
                Cancel
              </button>
            </template>

            <template v-else-if="r.relation === 'incoming'">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                :disabled="busyKey === `${r.userId}-accept`"
                data-testid="friend-accept-btn"
                @click="run(`${r.userId}-accept`, () => friendService.accept(r.requestId))"
              >
                Accept
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="busyKey === `${r.userId}-decline`"
                data-testid="friend-decline-btn"
                @click="run(`${r.userId}-decline`, () => friendService.reject(r.requestId))"
              >
                Decline
              </button>
            </template>

            <RouterLink v-else :to="`/friends/${r.userId}`" class="btn btn-sm btn-tinted">View profile</RouterLink>
          </FriendRow>
        </ul>
      </section>

      <!-- Friend requests -->
      <section v-if="incoming.length || outgoing.length" class="surface p-3 px-md-4" data-testid="friend-requests">
        <h2 class="section-title mb-2">
          Friend requests
          <span
            v-if="incoming.length"
            class="badge rounded-pill text-bg-danger ms-1 align-middle"
            style="font-size: 0.7rem"
            data-testid="friend-requests-count"
          >{{ incoming.length }}<span class="visually-hidden"> pending</span></span>
        </h2>

        <template v-if="incoming.length">
          <div class="eyebrow mt-2">For you</div>
          <ul class="divided list-unstyled mb-0" data-testid="requests-incoming">
            <FriendRow v-for="r in incoming" :key="r.requestId" :user="r" :subtitle="sentLabel(r.since)">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                :disabled="busyKey === `${r.userId}-accept`"
                data-testid="friend-accept-btn"
                @click="run(`${r.userId}-accept`, () => friendService.accept(r.requestId))"
              >
                Accept
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="busyKey === `${r.userId}-decline`"
                data-testid="friend-decline-btn"
                @click="run(`${r.userId}-decline`, () => friendService.reject(r.requestId))"
              >
                Decline
              </button>
            </FriendRow>
          </ul>
        </template>

        <template v-if="outgoing.length">
          <div class="eyebrow mt-3">Sent</div>
          <ul class="divided list-unstyled mb-0" data-testid="requests-outgoing">
            <FriendRow v-for="r in outgoing" :key="r.requestId" :user="r" :subtitle="sentLabel(r.since)">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="busyKey === `${r.userId}-cancel`"
                data-testid="friend-cancel-btn"
                @click="run(`${r.userId}-cancel`, () => friendService.cancel(r.requestId))"
              >
                Cancel
              </button>
            </FriendRow>
          </ul>
        </template>
      </section>

      <!-- Your friends -->
      <section class="surface p-3 px-md-4" data-testid="friends-list">
        <h2 class="section-title mb-2">Your friends</h2>
        <div v-if="friends.length === 0" class="text-center py-4">
          <i class="bi bi-people d-block mb-2" style="font-size: 2rem; color: var(--fb-text-3)" aria-hidden="true"></i>
          <p class="text-muted mb-0">No friends yet. Search above to find athletes you know.</p>
        </div>
        <ul v-else class="divided list-unstyled mb-0">
          <FriendRow
            v-for="f in friends"
            :key="f.userId"
            :user="f"
            :subtitle="friendsSinceLabel(f.since)"
            :to="`/friends/${f.userId}`"
          >
            <RouterLink :to="`/friends/${f.userId}`" class="btn btn-sm btn-tinted px-3">View</RouterLink>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              :aria-label="`Remove ${f.displayName}`"
              :title="`Remove ${f.displayName}`"
              data-testid="friend-remove-btn"
              @click="removing = f"
            >
              <i class="bi bi-person-dash" aria-hidden="true"></i>
            </button>
          </FriendRow>
        </ul>
      </section>
    </div>

    <!-- Confirm removing a friend -->
    <AppModal v-if="removing" :title="`Remove ${removing.displayName}?`" size="sm" @close="removing = null">
      <p class="mb-0" data-testid="remove-friend-modal">
        You'll stop seeing each other's progress. You can send a new request any time.
      </p>
      <template #footer>
        <button type="button" class="btn btn-light" @click="removing = null">Cancel</button>
        <button
          type="button"
          class="btn btn-danger"
          :disabled="busyKey === `${removing.userId}-remove`"
          data-testid="confirm-remove-friend-btn"
          @click="confirmRemove"
        >
          Remove
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { friendService } from '../services/friendService'
import { useFriendRequests } from '../composables/useFriendRequests'
import { errorMessage } from '../services/habitService'
import FriendRow from '../components/friends/FriendRow.vue'
import AppModal from '../components/habits/AppModal.vue'

const friends = ref([])
const incoming = ref([])
const outgoing = ref([])
const query = ref('')
const results = ref([])
const searched = ref(false) // a search has been run (so "no matches" can be shown)
const searchedQuery = ref('') // what that search was for, re-run after every action
const searchError = ref('')
const loading = ref(false)
const loaded = ref(false)
const searching = ref(false)
const error = ref('')
const busyKey = ref(null)
const toast = ref(null) // { text, kind: 'success' | 'info' }
const removing = ref(null) // the friend waiting for a "Remove?" answer

const RELATION_TEXT = {
  none: '',
  friends: 'Friends',
  outgoing: 'Request sent',
  incoming: 'Wants to be friends',
}

const summary = computed(() => {
  const pending = incoming.value.length + outgoing.value.length
  const f = friends.value.length
  return `${f} ${f === 1 ? 'friend' : 'friends'} · ${pending} pending ${pending === 1 ? 'request' : 'requests'}`
})

let toastTimer = null
function showToast(text, kind = 'success') {
  toast.value = { text, kind }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 3500)
}

// "Sent today", "Sent 2 days ago", or a short date for older requests
function sentLabel(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Sent today'
  if (days === 1) return 'Sent yesterday'
  if (days < 7) return `Sent ${days} days ago`
  return `Sent ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

function friendsSinceLabel(iso) {
  if (!iso) return 'Friends'
  return `Friends since ${new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
}

// Keep the navbar badge in step with the list on this page
const { setIncomingCount } = useFriendRequests()
watch(() => incoming.value.length, setIncomingCount)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await friendService.list()
    friends.value = data.friends
    incoming.value = data.incoming
    outgoing.value = data.outgoing
    setIncomingCount(data.incoming.length)
    loaded.value = true
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function search(text) {
  searching.value = true
  searchError.value = ''
  try {
    const data = await friendService.search(text)
    results.value = data.results
    searchedQuery.value = text
    searched.value = true
  } catch (err) {
    results.value = []
    searched.value = false
    searchError.value = errorMessage(err)
  } finally {
    searching.value = false
  }
}

function runSearch() {
  return search(query.value)
}

async function refresh() {
  await load()
  if (searched.value) await search(searchedQuery.value)
}

// Runs one friend action, shows the server's message, then reloads the page data
async function run(key, action) {
  busyKey.value = key
  try {
    const data = await action()
    showToast(data.message)
  } catch (err) {
    showToast(errorMessage(err), 'info')
  }
  await refresh()
  busyKey.value = null
}

async function confirmRemove() {
  const friend = removing.value
  await run(`${friend.userId}-remove`, () => friendService.remove(friend.userId))
  removing.value = null
}

onMounted(load)
</script>

<style scoped>
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Toast */
.fr-toast {
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
  animation: toast-drop 220ms var(--ease-out);
}
.fr-toast-success i {
  color: var(--fb-green-400);
}
.fr-toast-info i {
  color: var(--fb-yellow);
}
@keyframes toast-drop {
  from { opacity: 0; transform: translate(-50%, -12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .fr-toast {
    animation: none;
  }
}
</style>
