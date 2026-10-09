import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '../services/authService'
import LoginPage from '../components/LoginPage.vue'
import SignupPage from '../components/SignupPage.vue'
import Dashboard from '../views/Dashboard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/signup', name: 'signup', component: SignupPage },
    { 
      path: '/dashboard', 
      name: 'dashboard', 
      component: Dashboard,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = authService.isAuthenticated()
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  } else if ((to.name === 'login' || to.name === 'signup') && isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router

