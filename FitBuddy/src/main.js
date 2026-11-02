import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { vReveal, vTilt } from './directives/motion'
import { useThemeStore } from './stores/theme'
import { initOneSignal } from './services/notificationService'

import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('reveal', vReveal)
app.directive('tilt', vTilt)

// Apply the saved light/dark mode and background before the first paint
useThemeStore().applySavedAppearance()

app.mount('#app')

// Initialize OneSignal Web Push SDK
initOneSignal()
