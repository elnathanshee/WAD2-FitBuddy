<!--
  The row of page tabs in the top bar (Home, Habits, ... Groups).
  - One indicator slides behind the active tab, so switching pages reads as
    one continuous motion.
  - The Friends tab shows a red badge with the number of pending friend requests
    (the number lives in the friendRequests store).
  Only rendered while logged in (the Navbar uses v-if), so it starts fresh after every login.
  No props, no emits.
-->
<template>
  <nav ref="tabsEl" class="tabs" aria-label="Main" data-testid="tabbar">
    <span class="tab-indicator" :class="{ ready: indicatorReady }" :style="indicatorStyle" aria-hidden="true"></span>
    <router-link
      v-for="item in NAV_ITEMS"
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
          v-if="item.name === 'friends' && friendRequests.incomingCount > 0"
          class="tab-badge position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger"
          data-testid="friends-request-badge"
        >
          {{ friendRequests.incomingCount }}<span class="visually-hidden"> friend requests</span>
        </span>
      </span>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useFriendRequestsStore } from '../../stores/friendRequests'

const route = useRoute()
const friendRequests = useFriendRequestsStore()

const NAV_ITEMS = [
  { name: 'home', to: '/home', label: 'Home', icon: 'bi-house', iconActive: 'bi-house-fill' },
  { name: 'habits', to: '/habits', label: 'Habits', icon: 'bi-check2-square', iconActive: 'bi-check-square-fill' },
  { name: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'bi-bar-chart', iconActive: 'bi-bar-chart-fill' },
  { name: 'leaderboard', to: '/leaderboard', label: 'Leaderboard', icon: 'bi-trophy', iconActive: 'bi-trophy-fill' },
  { name: 'friends', to: '/friends', label: 'Friends', icon: 'bi-people', iconActive: 'bi-people-fill' },
  { name: 'groups', to: '/groups', label: 'Groups', icon: 'bi-people', iconActive: 'bi-people-fill' },
]

// A tab is active when the current URL starts with its path (so /friends/5 keeps Friends active)
function isActive(item) {
  return route.path.startsWith(item.to)
}

// --- Sliding indicator behind the active tab ---
// Beyond WAD2 syllabus: a template ref (ref="tabsEl" in the template) lets us measure the
// real position and width of the active tab, which CSS alone cannot tell the indicator.
const tabsEl = ref(null)
const indicator = ref({ x: 0, width: 0, visible: false })
const indicatorReady = ref(false) // false = no transition on the very first placement

const indicatorStyle = computed(() => ({
  transform: `translateX(${indicator.value.x}px)`,
  width: `${indicator.value.width}px`,
  opacity: indicator.value.visible ? 1 : 0,
}))

// Measures the active tab and moves the indicator under it
function placeIndicator() {
  const container = tabsEl.value
  if (!container) return
  const active = container.querySelector('.tab.router-link-active')
  if (!active) {
    indicator.value = { ...indicator.value, visible: false }
    return
  }
  indicator.value = { x: active.offsetLeft, width: active.offsetWidth, visible: true }
  // Beyond WAD2 syllabus: requestAnimationFrame waits one frame so the first placement
  // happens without a slide, and only later moves animate.
  if (!indicatorReady.value) requestAnimationFrame(() => (indicatorReady.value = true))
}

// Beyond WAD2 syllabus: watch + nextTick. When the page changes, the router link classes
// update on the next render, so we wait for that render (nextTick) before measuring.
watch(
  () => route.path,
  () => nextTick(placeIndicator),
)

onMounted(() => {
  nextTick(placeIndicator)
  // Beyond WAD2 syllabus: the tab widths change when the window is resized or the web
  // font finishes loading, so the indicator must be measured again.
  window.addEventListener('resize', placeIndicator)
  document.fonts?.ready.then(placeIndicator)
})

// Beyond WAD2 syllabus: onUnmounted removes the window listener; otherwise it would keep
// running after this component is gone (for example after logging out).
onUnmounted(() => window.removeEventListener('resize', placeIndicator))
</script>

<style scoped>
.tabs {
  grid-area: tabs;
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr)); /* minmax(0, ...) keeps all six tabs exactly equal */
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

/* Phones and tablets: the tabs sit on the second row of the bar */
@media (max-width: 991.98px) {
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
    font-size: 0.625rem; /* 10px: fits "Leaderboard" in one of six equal tabs on a 375px phone */
    white-space: nowrap;
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
