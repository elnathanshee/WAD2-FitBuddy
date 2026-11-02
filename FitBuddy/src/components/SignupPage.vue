<template>
  <div class="row g-0 auth-wrapper flex-row-reverse">
    <div class="col-lg-6 auth-brand-section d-none d-lg-flex">
      <i class="bi bi-trophy-fill text-white" style="font-size: 5rem;"></i>
      <h1 class="fw-bold mt-4 mb-3">Join HabitBuddy</h1>
      <p class="lead text-light opacity-75">Start your personalized fitness adventure and build daily habits that last.</p>
    </div>
    
    <div class="col-lg-6 auth-form-section">
      <div class="auth-form-card shadow-sm p-4 p-md-5 rounded-4">
        <div class="text-center mb-4 d-lg-none">
          <BrandMark class="auth-logo mx-auto" aria-hidden="true" />
          <h2 class="fw-bold mt-2">HabitBuddy</h2>
        </div>
        
        <h3 class="fw-bold mb-4 text-center">Create an Account</h3>
        
        <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-circle me-2"></i>{{ errorMsg }}
          <button type="button" class="btn-close" @click="errorMsg = ''"></button>
        </div>

        <form @submit.prevent="handleSignup">
          <div class="form-floating mb-3">
            <input type="text" class="form-control" id="name" v-model="form.name" placeholder="John Doe" required maxlength="60">
            <label for="name">Full Name</label>
          </div>
          
          <div class="form-floating mb-3">
            <input type="email" class="form-control" id="email" v-model="form.email" placeholder="name@example.com" required>
            <label for="email">Email address</label>
          </div>
          
          <div class="form-floating mb-3">
            <input type="password" class="form-control" id="password" v-model="form.password" placeholder="Password" required minlength="6">
            <label for="password">Password (min 6 chars)</label>
          </div>
          
          <div class="form-floating mb-3">
            <input type="password" class="form-control" :class="{'is-invalid': passwordMismatch}" id="confirmPassword" v-model="form.confirmPassword" placeholder="Confirm Password" required>
            <label for="confirmPassword">Confirm Password</label>
            <div class="invalid-feedback">Passwords do not match.</div>
          </div>

          <div class="surface p-3 mb-3">
            <label for="primaryGoal" class="form-label fw-semibold mb-2">What’s your main goal?</label>
            <select id="primaryGoal" class="form-select" v-model="form.primaryGoal">
              <option v-for="goal in GOAL_OPTIONS" :key="goal.value" :value="goal.value">{{ goal.label }}</option>
            </select>
            <div v-if="selectedGoal?.targetLabel" class="form-floating mt-3">
              <input id="goalTarget" v-model="form.goalTarget" class="form-control" maxlength="80" placeholder="Your target">
              <label for="goalTarget">{{ selectedGoal.targetLabel }}</label>
            </div>
            <p class="small text-muted mb-0 mt-2">We’ll add a few matching habits to get you started. You can edit or remove them anytime.</p>
          </div>
          
          <div class="form-check mb-4">
            <input class="form-check-input" type="checkbox" id="terms" v-model="form.terms" required>
            <label class="form-check-label text-muted small" for="terms">
              I agree to the <a href="#" class="text-primary text-decoration-none">Terms & Conditions</a>
            </label>
          </div>
          
          <button type="submit" class="btn btn-primary w-100 py-3 rounded-pill mb-4" :disabled="loading || passwordMismatch">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {{ loading ? 'Creating Account & Bootstrapping Habits...' : 'Sign Up' }}
          </button>
          
          <p class="text-center text-muted mb-0">
            Already have an account? <router-link to="/login" class="text-primary fw-semibold text-decoration-none">Log in</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import BrandMark from './BrandMark.vue'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { GOAL_OPTIONS } from '../utils/goalOptions'

const router = useRouter()
const auth = useAuthStore()
const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: false,
  primaryGoal: 'wellness',
  goalTarget: '',
})
const loading = ref(false)
const errorMsg = ref('')

const passwordMismatch = computed(() => {
  return form.value.password && form.value.confirmPassword && form.value.password !== form.value.confirmPassword
})
const selectedGoal = computed(() => GOAL_OPTIONS.find((goal) => goal.value === form.value.primaryGoal))

const handleSignup = async () => {
  if (passwordMismatch.value) return
  errorMsg.value = ''
  loading.value = true
  try {
    await auth.signup({ name: form.value.name, email: form.value.email, password: form.value.password, primaryGoal: form.value.primaryGoal, goalTarget: form.value.goalTarget })
    router.push('/home')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'An error occurred during signup.'
  } finally {
    loading.value = false
  }
}
</script>
