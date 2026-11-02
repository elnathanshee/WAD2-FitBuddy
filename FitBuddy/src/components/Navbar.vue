<!--
  App navigation, always at the top inside one bar:
  - brand | page tabs | account menu (background, switch demo athlete, log out)
  - The five tabs share the space between the brand and the account menu
    equally. On phones and tablets they move to a second row of the same bar, full width.
  - One indicator slides behind the active tab, so switching pages reads as
    one continuous motion.
-->
<template>
  <header class="topbar glass sticky-top" data-testid="navbar">
    <div class="container topbar-inner" :class="{ authed: isAuthenticated }">
      <router-link class="brand pressable" :to="isAuthenticated ? '/home' : '/login'">
        <BrandMark class="brand-mark" aria-hidden="true" />
        <span class="brand-name">HabitBuddy</span>
      </router-link>

      <!-- Page tabs: equal widths across the remaining space -->
      <nav v-if="isAuthenticated" ref="tabsEl" class="tabs" aria-label="Main" data-testid="tabbar">
        <span class="tab-indicator" :class="{ ready: indicatorReady }" :style="indicatorStyle" aria-hidden="true"></span>
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="tab pressable"
          :class="{ 'router-link-active': isActive(item) }"
          :data-testid="`tab-${item.name}`"
        >
          <!-- Wrapper lets the badge sit on the icon's top-right corner -->
          <span class="tab-icon position-relative">
            <i class="bi" :class="isActive(item) ? item.iconActive : item.icon" aria-hidden="true"></i>
            <!-- Badge: number of pending incoming friend requests (hidden at 0) -->
            <span
              v-if="item.name === 'friends' && incomingCount > 0"
              class="tab-badge position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger"
              data-testid="friends-request-badge"
            >
              {{ incomingCount }}<span class="visually-hidden"> friend requests</span>
            </span>
          </span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Notifications Bell Button -->
      <button
        v-if="isAuthenticated"
        type="button"
        class="btn btn-icon pressable text-muted me-1"
        style="width: 38px; height: 38px; border-radius: 50%;"
        title="Reminders & Notifications"
        aria-label="Reminders and Notifications"
        @click="showNotificationsModal = true"
      >
        <i class="bi bi-bell fs-5"></i>
      </button>

      <!-- Account menu -->
      <div v-if="isAuthenticated" class="dropdown account">
        <button
          class="account-btn pressable"
          type="button"
          data-bs-toggle="dropdown"
          data-bs-auto-close="outside"
          aria-expanded="false"
          data-testid="account-menu-btn"
        >
          <span
            class="avatar"
            :style="{ width: '30px', height: '30px', backgroundColor: currentUser?.avatarColor || '#4F46E5', fontSize: '13px' }"
          >
            {{ (currentUser?.name || 'U').charAt(0).toUpperCase() }}
          </span>
          <span class="d-none d-sm-inline small fw-semibold">{{ currentUser?.name || 'Athlete' }}</span>
          <i class="bi bi-chevron-down small text-muted" aria-hidden="true"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end account-menu">
          <li class="px-2 pt-1 pb-2">
            <div class="fw-semibold small">{{ currentUser?.name || 'Athlete' }}</div>
            <div class="text-muted" style="font-size: 12px">{{ currentUser?.email }}</div>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li>
            <button class="dropdown-item small d-flex align-items-center gap-2" @click="showNotificationsModal = true">
              <i class="bi bi-bell text-primary" aria-hidden="true"></i>Reminders & Notifications
            </button>
          </li>
          <li>
            <router-link class="dropdown-item small d-flex align-items-center gap-2" to="/goals">
              <i class="bi bi-bullseye text-primary" aria-hidden="true"></i>My goal & habit plan
            </router-link>
          </li>
          <li>
            <router-link class="dropdown-item small d-flex align-items-center gap-2" to="/achievements" data-testid="achievements-link">
              <i class="bi bi-award text-primary" aria-hidden="true"></i>Achievements
            </router-link>
          </li>
          <li>
            <button class="dropdown-item small d-flex align-items-center gap-2" data-testid="edit-profile-btn" @click="showEditProfileModal = true">
              <i class="bi bi-person-gear text-primary" aria-hidden="true"></i>Edit profile
            </button>
          </li>
          <li>
            <router-link class="dropdown-item small d-flex align-items-center gap-2" to="/meals">
              <i class="bi bi-egg-fried text-primary" aria-hidden="true"></i>Goal-based meal planner
            </router-link>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li><h6 class="dropdown-header px-2">Appearance</h6></li>
          <li class="px-2 pb-2">
            <div class="appearance-mode-picker" role="radiogroup" aria-label="Appearance mode">
              <button
                v-for="mode in APPEARANCE_MODES"
                :key="mode.value"
                type="button"
                role="radio"
                class="appearance-mode pressable"
                :class="{ selected: themeMode === mode.value }"
                :aria-checked="themeMode === mode.value"
                :data-testid="`appearance-${mode.value}`"
                @click="setThemeMode(mode.value)"
              >
                <i class="bi" :class="mode.icon" aria-hidden="true"></i>
                <span>{{ mode.label }}</span>
              </button>
            </div>
            <label class="auto-night-toggle d-flex align-items-center justify-content-between gap-3 mt-3">
              <span>
                <span class="d-block fw-semibold small">Switch to night mode automatically</span>
                <span class="d-block appearance-hint small text-muted">Dark at 8 PM · light at 6 AM</span>
              </span>
              <input
                class="form-check-input m-0"
                type="checkbox"
                role="switch"
                aria-label="Switch to night mode automatically"
                data-testid="appearance-auto-toggle"
                :checked="themeMode === 'auto'"
                @change="setThemeMode($event.target.checked ? 'auto' : 'light')"
              />
            </label>
          </li>
          <li><h6 class="dropdown-header px-2">{{ isDark ? 'Dark' : 'Light' }} backgrounds</h6></li>
          <li class="px-2 pb-2">
            <div class="bg-picker" role="radiogroup" :aria-label="`${isDark ? 'Dark' : 'Light'} background`" data-testid="bg-picker">
              <button
                v-for="bg in BACKGROUNDS"
                :key="bg.id"
                type="button"
                role="radio"
                class="bg-swatch pressable"
                :class="{ selected: background === bg.id }"
                :data-bg-preview="bg.id"
                :aria-checked="background === bg.id"
                :aria-label="bg.label"
                :title="bg.label"
                :data-testid="`bg-${bg.id}`"
                :style="bg.preview ? { backgroundImage: `url(${bg.preview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
                @click="setBackground(bg.id)"
              ></button>
            </div>
            <div class="mt-3">
              <label class="form-label small fw-semibold mb-1" for="background-theme">Wallpaper appearance</label>
              <select id="background-theme" v-model="uploadTheme" class="form-select form-select-sm mb-2">
                <option value="light">Light backgrounds</option>
                <option value="dark">Dark backgrounds</option>
              </select>
              <input ref="backgroundFile" type="file" class="d-none" accept="image/png,image/jpeg,image/webp" aria-label="Choose a wallpaper image" @change="saveUploadedBackground" />
              <button type="button" class="btn btn-sm btn-outline-primary w-100" data-testid="add-custom-wallpaper" @click="backgroundFile?.click()">
                <i class="bi bi-image me-1" aria-hidden="true"></i>Add custom wallpaper
              </button>
              <div v-if="backgroundMessage" class="small mt-1" :class="backgroundError ? 'text-danger' : 'text-success'" role="status">{{ backgroundMessage }}</div>
              <div v-if="customBackgrounds.length" class="custom-background-list mt-2">
                <div v-for="bg in customBackgrounds" :key="bg.id" class="d-flex align-items-center justify-content-between gap-2 small">
                  <span class="text-truncate">{{ bg.label }}</span>
                  <button type="button" class="btn btn-sm btn-link text-danger p-0" :aria-label="`Remove ${bg.label}`" @click="removeBackground(bg.id)">Remove</button>
                </div>
              </div>
            </div>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li><h6 class="dropdown-header px-2">Switch demo athlete</h6></li>
          <li v-for="athlete in demoAthletes" :key="athlete.email">
            <button
              class="dropdown-item d-flex align-items-center gap-2 small"
              :class="{ active: currentUser?.email === athlete.email }"
              @click="switchAthlete(athlete.email)"
            >
              <span class="rounded-circle d-inline-block" :style="{ width: '10px', height: '10px', backgroundColor: athlete.color }"></span>
              {{ athlete.name }}
            </button>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li>
            <button class="dropdown-item small text-danger d-flex align-items-center gap-2" data-testid="logout-btn" @click="handleLogout">
              <i class="bi bi-box-arrow-right" aria-hidden="true"></i>Log out
            </button>
          </li>
        </ul>
      </div>

      <div v-else class="d-flex align-items-center gap-2 account">
        <router-link class="btn btn-sm btn-link text-decoration-none fw-semibold" to="/login">Log in</router-link>
        <router-link class="btn btn-sm btn-primary px-3" to="/signup">Sign up</router-link>
      </div>
    </div>
  </header>

  <NotificationModal v-if="showNotificationsModal" @close="showNotificationsModal = false" />

  <EditProfileModal
    v-if="showEditProfileModal && currentUser"
    :user="currentUser"
    @saved="onProfileSaved"
    @close="showEditProfileModal = false"
  />
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '../services/authService'
import { useBackground } from '../composables/useBackground'
import { useFriendRequests } from '../composables/useFriendRequests'
import BrandMark from './BrandMark.vue'
import NotificationModal from './notifications/NotificationModal.vue'
import EditProfileModal from './profile/EditProfileModal.vue'

const showNotificationsModal = ref(false)
const showEditProfileModal = ref(false)

const router = useRouter()
const route = useRoute()
const { background, setBackground, BACKGROUNDS, themeMode, setThemeMode, isDark, addCustomBackground, removeCustomBackground } = useBackground()
const uploadTheme = ref('light')
const backgroundFile = ref(null)
const backgroundMessage = ref('')
const backgroundError = ref(false)
const customBackgrounds = computed(() => BACKGROUNDS.value.filter((bg) => bg.custom))

async function saveUploadedBackground(event) {
  const file = event.target.files?.[0]
  backgroundMessage.value = ''
  backgroundError.value = false
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    backgroundMessage.value = 'Choose a JPG, PNG, or WebP image.'
    backgroundError.value = true
    event.target.value = ''
    return
  }
  try {
    const bitmap = await createImageBitmap(file)
    const ratio = Math.min(1, 1400 / bitmap.width, 1000 / bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * ratio)
    canvas.height = Math.round(bitmap.height * ratio)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const image = canvas.toDataURL('image/jpeg', 0.78)
    const label = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'My photo'
    const result = addCustomBackground(image, uploadTheme.value, label)
    if (result.error) throw new Error(result.error)
    backgroundMessage.value = `Saved to ${uploadTheme.value} backgrounds.`
  } catch (err) {
    backgroundMessage.value = err.message || 'Could not save this image.'
    backgroundError.value = true
  } finally {
    event.target.value = ''
  }
}

function removeBackground(id) {
  removeCustomBackground(id)
  backgroundMessage.value = 'Custom background removed.'
  backgroundError.value = false
}
// Shared pending-request count that feeds the Friends tab badge
const { incomingCount, refreshFriendRequests } = useFriendRequests()

const navItems = [
  { name: 'home', to: '/home', label: 'Home', icon: 'bi-house', iconActive: 'bi-house-fill' },
  { name: 'habits', to: '/habits', label: 'Habits', icon: 'bi-check2-square', iconActive: 'bi-check-square-fill' },
  { name: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'bi-bar-chart', iconActive: 'bi-bar-chart-fill' },
  { name: 'leaderboard', to: '/leaderboard', label: 'Leaderboard', icon: 'bi-trophy', iconActive: 'bi-trophy-fill' },
  { name: 'friends', to: '/friends', label: 'Friends', icon: 'bi-people', iconActive: 'bi-people-fill' },
  { name: 'groups', to: '/groups', label: 'Groups', icon: 'bi-people', iconActive: 'bi-people-fill' },
]

const APPEARANCE_MODES = [
  { value: 'light', label: 'Light', icon: 'bi-sun' },
  { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
]

const demoAthletes = [
  { name: 'You (Demo)', email: 'demo@fitbuddy.com', color: '#4F46E5' },
  { name: 'Alex Tan', email: 'alex@fitbuddy.com', color: '#4CAF50' },
  { name: 'Bernice Lim', email: 'bernice@fitbuddy.com', color: '#FF9800' },
  { name: 'Charlie Wong', email: 'charlie@fitbuddy.com', color: '#9C27B0' },
  { name: 'David Lee', email: 'david@fitbuddy.com', color: '#2196F3' },
]

const isAuthenticated = computed(() => {
  route.path // Dependency to trigger re-evaluation on route change
  return authService.isAuthenticated()
})

// Bumped after the profile is saved, so the computed below re-reads the stored
// user and the name and avatar in the bar update straight away.
const profileVersion = ref(0)

const currentUser = computed(() => {
  route.path
  profileVersion.value
  return authService.getCurrentUser()
})

const onProfileSaved = () => {
  showEditProfileModal.value = false
  profileVersion.value++
}

const isActive = (item) => route.path.startsWith(item.to)

// --- Sliding indicator behind the active tab ---
const tabsEl = ref(null)
const indicator = ref({ x: 0, width: 0, visible: false })
const indicatorReady = ref(false) // no transition on the very first placement

const indicatorStyle = computed(() => ({
  transform: `translateX(${indicator.value.x}px)`,
  width: `${indicator.value.width}px`,
  opacity: indicator.value.visible ? 1 : 0,
}))

function placeIndicator() {
  const container = tabsEl.value
  if (!container) return
  const active = container.querySelector('.tab.router-link-active')
  if (!active) {
    indicator.value = { ...indicator.value, visible: false }
    return
  }
  indicator.value = { x: active.offsetLeft, width: active.offsetWidth, visible: true }
  if (!indicatorReady.value) requestAnimationFrame(() => (indicatorReady.value = true))
}

watch(
  () => [route.path, isAuthenticated.value],
  () => {
    nextTick(placeIndicator)
    // Keep the badge current as the user moves between pages (logged in only)
    if (isAuthenticated.value) refreshFriendRequests()
  },
)
onMounted(() => {
  // Load the badge count on first render (logged in only)
  if (isAuthenticated.value) refreshFriendRequests()
  nextTick(placeIndicator)
  window.addEventListener('resize', placeIndicator)
  document.fonts?.ready.then(placeIndicator)
})
onUnmounted(() => window.removeEventListener('resize', placeIndicator))

const handleLogout = () => {
  authService.logout()
  indicatorReady.value = false
  router.push('/login')
}

const switchAthlete = async (email) => {
  try {
    await authService.login(email, 'password123')
    window.location.reload()
  } catch (err) {
    console.error('Failed to switch athlete:', err)
  }
}
</script>

<style scoped>
.topbar {
  z-index: 1030;
  border-bottom: 1px solid var(--fb-hairline);
}
.topbar-inner {
  min-height: 64px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'brand tabs account';
  align-items: center;
  column-gap: var(--s-6);
}
.brand {
  grid-area: brand;
}
.account {
  grid-area: account;
  justify-self: end;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  text-decoration: none;
  color: var(--fb-text);
}
.brand-mark {
  font-size: 34px; /* the logo is sized in em */
  filter: drop-shadow(0 1px 2px rgba(28, 27, 24, 0.12));
}
.brand-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-lg);
  letter-spacing: 0;
}

/* Account menu */
.account-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: 40px;
  padding: var(--s-1) var(--s-3) var(--s-1) var(--s-1);
  border: 1px solid var(--fb-hairline);
  border-radius: 999px;
  background: var(--fb-surface);
  color: var(--fb-text);
}
.account-menu {
  min-width: 290px;
  transform-origin: top right;
  /* The menu is tall (appearance + backgrounds + demo athletes + log out), so on a
     short window it used to run past the bottom of the screen and Log out could not
     be reached. Cap it to the space under the navbar and let it scroll instead.
     dvh is used so mobile browser chrome does not hide the last item. */
  max-height: calc(100vh - 4.5rem);
  max-height: calc(100dvh - 4.5rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.appearance-mode-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-1);
  padding: var(--s-1);
  border-radius: var(--r-md);
  background: var(--fb-bg);
}
.appearance-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: var(--s-2) var(--s-1);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--fb-text-2);
  font-size: .72rem;
  font-weight: 700;
  white-space: nowrap;
}
.appearance-mode.selected {
  border-color: var(--fb-hairline);
  background: var(--fb-surface);
  color: var(--fb-text);
  box-shadow: var(--fb-shadow-sm);
}
.appearance-mode i {
  font-size: 1rem;
}
.appearance-hint {
  line-height: 1.35;
}
.bg-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--s-2);
}
.bg-swatch {
  aspect-ratio: 1;
  min-width: 36px;
  border-radius: var(--r-sm);
  border: 1px solid var(--fb-hairline);
  padding: 0;
  transition: box-shadow 150ms ease, transform var(--dur-press) var(--ease-out);
}
.bg-swatch.selected {
  box-shadow: 0 0 0 2px var(--fb-surface), 0 0 0 4px var(--fb-green-600);
}
.account-menu.show {
  animation: menu-in 160ms var(--ease-out);
}
@keyframes menu-in {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: none; }
}

/* ---------- Page tabs (inside the top bar) ---------- */
.tabs {
  grid-area: tabs;
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--s-1);
  align-self: stretch;
  padding: var(--s-2) 0;
}
.tab-indicator {
  position: absolute;
  top: var(--s-2);
  bottom: var(--s-2);
  left: 0;
  border-radius: var(--r-md);
  background: var(--fb-green-50);
  box-shadow: inset 0 0 0 1px var(--fb-green-100);
}
.tab-indicator.ready {
  transition:
    transform 260ms var(--ease-in-out),
    width 260ms var(--ease-in-out),
    opacity 150ms ease;
}
.tab {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  min-height: 44px;
  border-radius: var(--r-md);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--fb-text-2);
  text-decoration: none;
  white-space: nowrap;
  transition: color 150ms ease, transform var(--dur-press) var(--ease-out);
}
.tab i {
  font-size: var(--fs-md);
  line-height: 1;
}
.tab-icon {
  /* position: relative (via class) lets the badge be placed against the icon */
  display: inline-flex;
}
/* Absolutely positioned, so it never changes the tab widths */
.tab-badge {
  font-size: 0.6rem;
  padding: 0.25em 0.45em;
  line-height: 1;
}
.tab.router-link-active {
  color: var(--fb-green-700);
}
@media (hover: hover) and (pointer: fine) {
  .tab:not(.router-link-active):hover {
    color: var(--fb-text);
  }
}

/* Phones and tablets: brand + account on the first row, tabs across the second */
@media (max-width: 991.98px) {
  .topbar-inner.authed {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'brand account'
      'tabs tabs';
  }
  .tabs {
    padding: 0 0 var(--s-2);
  }
  .tab-indicator {
    top: 0;
  }
  .tab {
    flex-direction: column;
    gap: 2px;
    min-height: 48px;
    font-size: 0.6875rem; /* 11px: fits "Leaderboard" so all five tabs stay equal width */
  }
  .tab i {
    font-size: var(--fs-lg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-indicator.ready {
    transition: opacity 150ms ease;
  }
}
</style>
