// Per-device appearance preferences. Background patterns are CSS in main.css;
// this composable stores independent light and dark choices and applies the
// selected palette as attributes on <html>.
import { computed, ref } from 'vue'

export const LIGHT_BACKGROUNDS = [
  { id: 'paper', label: 'Warm paper' },
  { id: 'dots', label: 'Quiet dots' },
  { id: 'topo', label: 'Trail map' },
  { id: 'track', label: 'Sunset track' },
  { id: 'field', label: 'Meadow' },
]

export const DARK_BACKGROUNDS = [
  { id: 'dark-paper', label: 'Night paper' },
  { id: 'dark-dots', label: 'Moonlit dots' },
  { id: 'dark-topo', label: 'Night trail' },
  { id: 'dark-track', label: 'Evening track' },
  { id: 'dark-field', label: 'Deep meadow' },
]

export const BACKGROUNDS = [...LIGHT_BACKGROUNDS, ...DARK_BACKGROUNDS]

const MODE_KEY = 'fitbuddy_appearance_mode'
const LIGHT_BG_KEY = 'fitbuddy_light_background'
const DARK_BG_KEY = 'fitbuddy_dark_background'
const LEGACY_BG_KEY = 'fitbuddy_background'
const DEFAULT_LIGHT_BG = 'topo'
const DEFAULT_DARK_BG = 'dark-topo'
const AUTO_DARK_HOUR = 20
const AUTO_LIGHT_HOUR = 6

function readStored(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, value) } catch { /* storage may be blocked */ }
}

function readMode() {
  const value = readStored(MODE_KEY)
  return ['light', 'dark', 'auto'].includes(value) ? value : 'light'
}

function readLightBackground() {
  const stored = readStored(LIGHT_BG_KEY)
  if (LIGHT_BACKGROUNDS.some((bg) => bg.id === stored)) return stored
  const legacy = readStored(LEGACY_BG_KEY)
  return LIGHT_BACKGROUNDS.some((bg) => bg.id === legacy) ? legacy : DEFAULT_LIGHT_BG
}

function readDarkBackground() {
  const stored = readStored(DARK_BG_KEY)
  return DARK_BACKGROUNDS.some((bg) => bg.id === stored) ? stored : DEFAULT_DARK_BG
}

function isNightTime(date = new Date()) {
  const hour = date.getHours()
  return hour >= AUTO_DARK_HOUR || hour < AUTO_LIGHT_HOUR
}

const themeMode = ref(readMode())
const lightBackground = ref(readLightBackground())
const darkBackground = ref(readDarkBackground())
const isDark = ref(themeMode.value === 'dark' || (themeMode.value === 'auto' && isNightTime()))
const background = computed(() => isDark.value ? darkBackground.value : lightBackground.value)
const visibleBackgrounds = computed(() => isDark.value ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS)

function applyAppearance() {
  isDark.value = themeMode.value === 'dark' || (themeMode.value === 'auto' && isNightTime())
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
  document.documentElement.dataset.bg = background.value
  writeStored(LEGACY_BG_KEY, background.value)
}

function setThemeMode(mode) {
  if (!['light', 'dark', 'auto'].includes(mode)) return
  themeMode.value = mode
  writeStored(MODE_KEY, mode)
  applyAppearance()
}

function setBackground(id) {
  if (LIGHT_BACKGROUNDS.some((bg) => bg.id === id)) {
    lightBackground.value = id
    writeStored(LIGHT_BG_KEY, id)
  } else if (DARK_BACKGROUNDS.some((bg) => bg.id === id)) {
    darkBackground.value = id
    writeStored(DARK_BG_KEY, id)
  } else {
    return
  }
  applyAppearance()
}

applyAppearance()
// Keep the automatic schedule correct while the app is open, including when
// a laptop wakes from sleep or a background tab becomes active again.
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    if (themeMode.value === 'auto') applyAppearance()
  }, 60_000)
  window.addEventListener('focus', () => {
    if (themeMode.value === 'auto') applyAppearance()
  })
  document.addEventListener('visibilitychange', () => {
    if (themeMode.value === 'auto' && !document.hidden) applyAppearance()
  })
}

export function useBackground() {
  return {
    background,
    setBackground,
    BACKGROUNDS: visibleBackgrounds,
    themeMode,
    setThemeMode,
    isDark,
  }
}
