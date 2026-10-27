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
          <li><h6 class="dropdown-header px-2">Background</h6></li>
          <li class="px-2 pb-2">
            <div class="bg-picker" role="radiogroup" aria-label="Background" data-testid="bg-picker">
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
                @click="setBackground(bg.id)"
              ></button>
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

</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '../services/authService'
import { useBackground } from '../composables/useBackground'
import { useFriendRequests } from '../composables/useFriendRequests'
import BrandMark from './BrandMark.vue'

const router = useRouter()
const route = useRoute()
const { background, setBackground, BACKGROUNDS } = useBackground()
// Shared pending-request count that feeds the Friends tab badge
const { incomingCount, refreshFriendRequests } = useFriendRequests()

const navItems = [
  { name: 'home', to: '/home', label: 'Home', icon: 'bi-house', iconActive: 'bi-house-fill' },
  { name: 'habits', to: '/habits', label: 'Habits', icon: 'bi-check2-square', iconActive: 'bi-check-square-fill' },
  { name: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'bi-bar-chart', iconActive: 'bi-bar-chart-fill' },
  { name: 'leaderboard', to: '/leaderboard', label: 'Leaderboard', icon: 'bi-trophy', iconActive: 'bi-trophy-fill' },
  { name: 'friends', to: '/friends', label: 'Friends', icon: 'bi-people', iconActive: 'bi-people-fill' },
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

const currentUser = computed(() => {
  route.path
  return authService.getCurrentUser()
})

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
  min-width: 230px;
  transform-origin: top right;
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
  grid-template-columns: repeat(5, 1fr);
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
