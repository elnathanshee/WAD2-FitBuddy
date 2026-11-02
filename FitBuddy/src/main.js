// Third-party library: Bootstrap 5 (https://getbootstrap.com) — layout, components and the modal/dropdown JavaScript
import 'bootstrap/dist/css/bootstrap.min.css'
// Third-party library: Bootstrap Icons (https://icons.getbootstrap.com) — the icon font used across the UI
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
// Third-party library: Pinia (https://pinia.vuejs.org) — shared state stores
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
