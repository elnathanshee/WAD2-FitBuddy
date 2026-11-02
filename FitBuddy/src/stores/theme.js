// Theme store: the light/dark/auto mode and the page background (built-in
// patterns or photos the user uploads). Choices are saved per device in
// localStorage and applied as attributes on <html>; the patterns themselves are
// CSS in main.css. Used by the Navbar (account menu), the analytics charts
// (they need to know if it is dark) and main.js (applies the saved look at start).
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const LIGHT_BACKGROUNDS = [
  { id: 'paper', label: 'Warm paper' },
  { id: 'dots', label: 'Quiet dots' },
  { id: 'topo', label: 'Trail map' },
  { id: 'track', label: 'Sunset track' },
  { id: 'field', label: 'Meadow' },
]

const DARK_BACKGROUNDS = [
  { id: 'dark-paper', label: 'Night paper' },
  { id: 'dark-dots', label: 'Moonlit dots' },
  { id: 'dark-topo', label: 'Night trail' },
  { id: 'dark-track', label: 'Evening track' },
  { id: 'dark-field', label: 'Deep meadow' },
]

const MODE_KEY = 'fitbuddy_appearance_mode'
const LIGHT_BG_KEY = 'fitbuddy_light_background'
const DARK_BG_KEY = 'fitbuddy_dark_background'
const LEGACY_BG_KEY = 'fitbuddy_background'
const CUSTOM_LIGHT_KEY = 'fitbuddy_custom_light_backgrounds'
const CUSTOM_DARK_KEY = 'fitbuddy_custom_dark_backgrounds'
const DEFAULT_LIGHT_BG = 'topo'
const DEFAULT_DARK_BG = 'dark-topo'
const AUTO_DARK_HOUR = 20
const AUTO_LIGHT_HOUR = 6

function readStored(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

function readMode() {
  const value = readStored(MODE_KEY)
  return ['light', 'dark', 'auto'].includes(value) ? value : 'light'
}

function readCustomBackgrounds(key) {
  try {
    const value = JSON.parse(readStored(key) || '[]')
    return Array.isArray(value) ? value.filter((entry) => entry?.id && entry?.dataUrl && entry?.label).slice(0, 4) : []
  } catch { return [] }
}

function readLightBackground() {
  const stored = readStored(LIGHT_BG_KEY)
  if (LIGHT_BACKGROUNDS.some((bg) => bg.id === stored)) return stored
  if (readCustomBackgrounds(CUSTOM_LIGHT_KEY).some((bg) => bg.id === stored)) return stored
  const legacy = readStored(LEGACY_BG_KEY)
  return LIGHT_BACKGROUNDS.some((bg) => bg.id === legacy) ? legacy : DEFAULT_LIGHT_BG
}

function readDarkBackground() {
  const stored = readStored(DARK_BG_KEY)
  if (readCustomBackgrounds(CUSTOM_DARK_KEY).some((bg) => bg.id === stored)) return stored
  return DARK_BACKGROUNDS.some((bg) => bg.id === stored) ? stored : DEFAULT_DARK_BG
}

function isNightTime(date = new Date()) {
  const hour = date.getHours()
  return hour >= AUTO_DARK_HOUR || hour < AUTO_LIGHT_HOUR
}

export const useThemeStore = defineStore('theme', () => {
  const themeMode = ref(readMode())
  const lightBackground = ref(readLightBackground())
  const darkBackground = ref(readDarkBackground())
  const customLightBackgrounds = ref(readCustomBackgrounds(CUSTOM_LIGHT_KEY))
  const customDarkBackgrounds = ref(readCustomBackgrounds(CUSTOM_DARK_KEY))
  const isDark = ref(themeMode.value === 'dark' || (themeMode.value === 'auto' && isNightTime()))
  const background = computed(() => isDark.value ? darkBackground.value : lightBackground.value)
  const currentCustomBackgrounds = computed(() => isDark.value ? customDarkBackgrounds.value : customLightBackgrounds.value)
  const visibleBackgrounds = computed(() => [
    ...(isDark.value ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS),
    ...currentCustomBackgrounds.value.map(({ id, label, dataUrl }) => ({ id, label, preview: dataUrl, custom: true })),
  ])

  function applyAppearance() {
    isDark.value = themeMode.value === 'dark' || (themeMode.value === 'auto' && isNightTime())
    document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
    // Also switch Bootstrap's own colour mode so its components (floating labels, selects, close buttons, tables, alerts) follow
    document.documentElement.dataset.bsTheme = isDark.value ? 'dark' : 'light'
    document.documentElement.dataset.bg = background.value
    const custom = [...customLightBackgrounds.value, ...customDarkBackgrounds.value].find((item) => item.id === background.value)
    if (custom) document.documentElement.style.setProperty('--fb-custom-bg-image', `url("${custom.dataUrl}")`)
    else document.documentElement.style.removeProperty('--fb-custom-bg-image')
    writeStored(LEGACY_BG_KEY, background.value)
  }

  function setThemeMode(mode) {
    if (!['light', 'dark', 'auto'].includes(mode)) return
    themeMode.value = mode
    writeStored(MODE_KEY, mode)
    applyAppearance()
  }

  function setBackground(id) {
    if (LIGHT_BACKGROUNDS.some((bg) => bg.id === id) || customLightBackgrounds.value.some((bg) => bg.id === id)) {
      lightBackground.value = id
      writeStored(LIGHT_BG_KEY, id)
    } else if (DARK_BACKGROUNDS.some((bg) => bg.id === id) || customDarkBackgrounds.value.some((bg) => bg.id === id)) {
      darkBackground.value = id
      writeStored(DARK_BG_KEY, id)
    } else {
      return
    }
    applyAppearance()
  }

  function addCustomBackground(dataUrl, theme, label = 'My photo') {
    if (!dataUrl?.startsWith('data:image/')) return { error: 'Choose a valid image.' }
    const list = theme === 'dark' ? customDarkBackgrounds : customLightBackgrounds
    if (list.value.length >= 4) return { error: `You can save up to 4 custom ${theme} backgrounds.` }
    const id = `custom-${theme}-${Date.now().toString(36)}`
    const next = [...list.value, { id, label: String(label).trim().slice(0, 24) || 'My photo', dataUrl }]
    if (!writeStored(theme === 'dark' ? CUSTOM_DARK_KEY : CUSTOM_LIGHT_KEY, JSON.stringify(next))) return { error: 'Your browser storage is full. Remove a saved photo and try again.' }
    list.value = next
    setBackground(id)
    return { id }
  }

  function removeCustomBackground(id) {
    const darkList = customDarkBackgrounds.value
    const lightList = customLightBackgrounds.value
    const dark = darkList.some((item) => item.id === id)
    const list = dark ? customDarkBackgrounds : customLightBackgrounds
    list.value = list.value.filter((item) => item.id !== id)
    writeStored(dark ? CUSTOM_DARK_KEY : CUSTOM_LIGHT_KEY, JSON.stringify(list.value))
    if ((dark && darkBackground.value === id) || (!dark && lightBackground.value === id)) setBackground(dark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG)
  }

  // Called once from main.js, before the app mounts, so the saved look shows before first paint
  function applySavedAppearance() {
    applyAppearance()
    // Beyond WAD2 syllabus: a timer and window/document listeners are needed so "auto" mode
    // switches between light and dark by itself while the app stays open (also after a
    // laptop wakes from sleep or a background tab becomes active again).
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

  return {
    background,
    visibleBackgrounds,
    themeMode,
    isDark,
    setBackground,
    setThemeMode,
    addCustomBackground,
    removeCustomBackground,
    applySavedAppearance,
  }
})
