<!--
  The account dropdown on the right of the top bar (Bootstrap dropdown):
  avatar button, links (goals, achievements, meals), the appearance/background
  picker, the demo athlete switcher and Log out.
  Props: user (the logged-in user from the auth store).
  Emits: 'open-notifications', 'edit-profile', 'logout' - the Navbar decides what to do.
-->
<template>
  <div class="dropdown account">
    <button
      class="account-btn pressable"
      type="button"
      data-bs-toggle="dropdown"
      data-bs-auto-close="outside"
      aria-expanded="false"
      data-testid="account-menu-btn"
    >
      <span class="avatar" :style="avatarStyle">{{ initial }}</span>
      <span class="d-none d-sm-inline small fw-semibold">{{ displayName }}</span>
      <i class="bi bi-chevron-down small text-muted" aria-hidden="true"></i>
    </button>
    <ul class="dropdown-menu dropdown-menu-end account-menu">
      <li class="px-2 pt-1 pb-2">
        <div class="fw-semibold small">{{ displayName }}</div>
        <div class="text-muted" style="font-size: 12px">{{ user?.email }}</div>
      </li>
      <li><hr class="dropdown-divider" /></li>
      <li>
        <button class="dropdown-item small d-flex align-items-center gap-2" @click="emit('open-notifications')">
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
        <button class="dropdown-item small d-flex align-items-center gap-2" data-testid="edit-profile-btn" @click="emit('edit-profile')">
          <i class="bi bi-person-gear text-primary" aria-hidden="true"></i>Edit profile
        </button>
      </li>
      <li>
        <router-link class="dropdown-item small d-flex align-items-center gap-2" to="/meals">
          <i class="bi bi-egg-fried text-primary" aria-hidden="true"></i>Goal-based meal planner
        </router-link>
      </li>
      <li><hr class="dropdown-divider" /></li>
      <AppearancePicker />
      <li><hr class="dropdown-divider" /></li>
      <DemoAthleteSwitcher :current-email="user?.email || ''" />
      <li><hr class="dropdown-divider" /></li>
      <li>
        <button class="dropdown-item small text-danger d-flex align-items-center gap-2" data-testid="logout-btn" @click="emit('logout')">
          <i class="bi bi-box-arrow-right" aria-hidden="true"></i>Log out
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppearancePicker from './AppearancePicker.vue'
import DemoAthleteSwitcher from './DemoAthleteSwitcher.vue'

const props = defineProps({
  user: { type: Object, default: null },
})
const emit = defineEmits(['open-notifications', 'edit-profile', 'logout'])

const displayName = computed(() => props.user?.name || 'Athlete')
const initial = computed(() => (props.user?.name || 'U').charAt(0).toUpperCase())
const avatarStyle = computed(() => ({
  width: '30px',
  height: '30px',
  backgroundColor: props.user?.avatarColor || '#4F46E5',
  fontSize: '13px',
}))
</script>

<style scoped>
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
.account-menu.show {
  animation: menu-in 160ms var(--ease-out);
}
@keyframes menu-in {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: none; }
}
</style>
