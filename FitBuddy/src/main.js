import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { vReveal, vTilt } from './directives/motion'
import './composables/useBackground' // applies the saved background before first paint
import { initOneSignal } from './services/notificationService'

import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const app = createApp(App)

app.use(router)
app.directive('reveal', vReveal)
app.directive('tilt', vTilt)

app.mount('#app')

// Initialize OneSignal Web Push SDK
initOneSignal()
