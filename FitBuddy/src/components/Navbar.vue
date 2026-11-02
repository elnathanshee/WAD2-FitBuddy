<!--
  App navigation, always at the top inside one bar:
  brand | page tabs (NavTabs) | account menu (AccountMenu).
  The tabs share the space between the brand and the account menu equally. On
  phones and tablets they move to a second row of the same bar, full width.
  Also opens the notifications and edit-profile modals when the menu asks for them.
-->
<template>
  <header class="topbar glass sticky-top" data-testid="navbar">
    <div class="container topbar-inner" :class="{ authed: isAuthenticated }">
      <router-link class="brand pressable" :to="isAuthenticated ? '/home' : '/login'">
        <BrandMark class="brand-mark" aria-hidden="true" />
        <span class="brand-name">HabitBuddy</span>
      </router-link>

      <!-- Page tabs and account menu: only when logged in -->
      <NavTabs v-if="isAuthenticated" />
      <AccountMenu
        v-if="isAuthenticated"
        :user="currentUser"
        @open-notifications="showNotificationsModal = true"
        @edit-profile="showEditProfileModal = true"
        @logout="handleLogout"
      />

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
    @saved="showEditProfileModal = false"
    @close="showEditProfileModal = false"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BrandMark from './BrandMark.vue'
import NavTabs from './navbar/NavTabs.vue'
import AccountMenu from './navbar/AccountMenu.vue'
import NotificationModal from './notifications/NotificationModal.vue'
import EditProfileModal from './profile/EditProfileModal.vue'

const router = useRouter()
const auth = useAuthStore()

const showNotificationsModal = ref(false)
const showEditProfileModal = ref(false)

// Both come from the auth store, so the bar updates by itself after login, logout or a profile edit
const isAuthenticated = computed(() => auth.isLoggedIn)
const currentUser = computed(() => auth.user)

function handleLogout() {
  auth.logout()
  router.push('/login')
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

/* Phones and tablets: brand + account on the first row, tabs across the second */
@media (max-width: 991.98px) {
  .topbar-inner.authed {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'brand account'
      'tabs tabs';
    padding-top: var(--s-2); /* breathing room above the logo and account button */
  }
}
</style>
