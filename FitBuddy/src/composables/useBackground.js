// App background presets. The choice is a per-device convenience, so it lives
// in localStorage (wrapped in try/catch: storage can be blocked) and is applied
// as <html data-bg="…">; the patterns themselves are CSS in assets/main.css.
import { ref } from 'vue'

export const BACKGROUNDS = [
  { id: 'paper', label: 'Paper' },
  { id: 'dots', label: 'Dot grid' },
  { id: 'topo', label: 'Trail map' },
  { id: 'track', label: 'Running track' },
  { id: 'field', label: 'Playing field' },
]

const STORAGE_KEY = 'fitbuddy_background'
const DEFAULT_BG = 'topo'

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return BACKGROUNDS.some((b) => b.id === value) ? value : DEFAULT_BG
  } catch {
    return DEFAULT_BG
  }
}

// Shared across every component that uses it
const current = ref(readStored())
document.documentElement.dataset.bg = current.value

export function useBackground() {
  function setBackground(id) {
    if (!BACKGROUNDS.some((b) => b.id === id)) return
    current.value = id
    document.documentElement.dataset.bg = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // storage blocked: the choice still applies until reload
    }
  }
  return { background: current, setBackground, BACKGROUNDS }
}
