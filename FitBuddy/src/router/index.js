import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '../services/authService'
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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // New pages start at the top; back/forward restores where the user was
  scrollBehavior: (to, from, savedPosition) => savedPosition || { top: 0 },
  routes: [
    // The entry point: Home when logged in, Login otherwise (decided in the guard below)
    { path: '/', name: 'root', redirect: () => (authService.isAuthenticated() ? '/home' : '/login') },
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
    { path: '/goals', name: 'goals', component: GoalPlanner, meta: { requiresAuth: true, title: 'My goal', description: 'Choose a personal goal and get a matching habit plan.' } },
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

router.beforeEach((to, from, next) => {
  const isAuthenticated = authService.isAuthenticated()
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  } else if ((to.name === 'login' || to.name === 'signup') && isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

// Each page gets its own tab title and meta description
const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]')?.content ?? ''
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · HabitBuddy` : 'HabitBuddy · Build habits with friends'
  document.querySelector('meta[name="description"]')?.setAttribute('content', to.meta.description ?? DEFAULT_DESCRIPTION)
})

export default router

