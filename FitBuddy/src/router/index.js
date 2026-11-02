import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useFriendRequestsStore } from '../stores/friendRequests'
import LoginPage from '../components/LoginPage.vue'
import SignupPage from '../components/SignupPage.vue'
import HomePage from '../views/HomePage.vue'
import Dashboard from '../views/Dashboard.vue'
import HabitsPage from '../views/HabitsPage.vue'
import Leaderboard from '../views/Leaderboard.vue'
import FriendsPage from '../views/FriendsPage.vue'
import FriendProfile from '../views/FriendProfile.vue'
import GroupsPage from '../views/GroupsPage.vue'
import GoalPlanner from '../views/GoalPlanner.vue'
import AchievementsPage from '../views/AchievementsPage.vue'
import MealPlanner from '../views/MealPlanner.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // New pages start at the top; back/forward restores where the user was
  scrollBehavior: (to, from, savedPosition) => savedPosition || { top: 0 },
  routes: [
    // The entry point: Home when logged in, Login otherwise (decided in the guard below)
    { path: '/', name: 'root', redirect: () => (useAuthStore().isLoggedIn ? '/home' : '/login') },
    { path: '/login', name: 'login', component: LoginPage, meta: { title: 'Log in' } },
    { path: '/signup', name: 'signup', component: SignupPage, meta: { title: 'Sign up' } },
    {
      path: '/home',
      name: 'home',
      component: HomePage,
      meta: { requiresAuth: true, title: 'Home', description: "Today's habits, highlights, active challenges and Google Health activity." }
    },
    { 
      path: '/dashboard', 
      name: 'dashboard', 
      component: Dashboard,
      meta: { requiresAuth: true, title: 'Dashboard', description: 'Completion rates, the month calendar, trends and streaks for your habits.' }
    },
    {
      path: '/habits',
      name: 'habits',
      component: HabitsPage,
      meta: { requiresAuth: true, title: 'Habits', description: 'Create, log and track your habits, with an AI coach for new ideas.' }
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: Leaderboard,
      meta: { requiresAuth: true, title: 'Leaderboard', description: "This week's points, rankings, and cheers between friends." }
    },
    {
      path: '/friends',
      name: 'friends',
      component: FriendsPage,
      meta: { requiresAuth: true, title: 'Friends', description: "Find athletes, manage friend requests and follow your friends' progress." }
    },
    {
      path: '/groups',
      name: 'groups',
      component: GroupsPage,
      meta: { requiresAuth: true, title: 'Habit groups', description: 'Check in with friends and compare points on your group leaderboard.' }
    },
    {
      path: '/achievements',
      name: 'achievements',
      component: AchievementsPage,
      meta: { requiresAuth: true, title: 'Achievements', description: 'Badges you have earned from your habit streaks, perfect days and points.' }
    },
    { path: '/goals', name: 'goals', component: GoalPlanner, meta: { requiresAuth: true, title: 'My goal', description: 'Choose a personal goal and get a matching habit plan.' } },
    { path: '/meals', name: 'meals', component: MealPlanner, meta: { requiresAuth: true, title: 'Meal planner', description: 'Meal ideas with ingredients and estimated macros based on your goal.' } },
    {
      path: '/friends/:id',
      name: 'friend-profile',
      component: FriendProfile,
      meta: { requiresAuth: true, title: 'Friend profile', description: "A friend's habits, streaks and progress this week." }
    },
    // Unknown URLs go back to the entry point
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

// Route guard: pages marked requiresAuth need a login. We remember where the user
// wanted to go (redirect) so the Login page can send them back after logging in.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    // Home is where Login goes by default, so no redirect is needed for it (keeps the URL a plain /login)
    if (to.fullPath === '/home') return { path: '/login' }
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // Already logged in, so there is no need to see Login or Signup
  if ((to.name === 'login' || to.name === 'signup') && auth.isLoggedIn) {
    return { name: 'home' }
  }
  return true
})

// Each page gets its own tab title and meta description
const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]')?.content ?? ''
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · HabitBuddy` : 'HabitBuddy · Build habits with friends'
  document.querySelector('meta[name="description"]')?.setAttribute('content', to.meta.description ?? DEFAULT_DESCRIPTION)

  // Keep the Friends tab badge current as the user moves between pages (logged in only)
  if (useAuthStore().isLoggedIn) useFriendRequestsStore().refreshFriendRequests()
})

export default router

