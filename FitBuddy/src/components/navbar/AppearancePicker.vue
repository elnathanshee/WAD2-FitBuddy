<!--
  "Appearance" and "backgrounds" sections of the account menu:
  - Light / Dark buttons and the "switch to night mode automatically" toggle
  - The wallpaper swatches for the current mode, and uploading/removing custom wallpapers
  All the settings live in the theme store. Renders <li> items, so it must sit
  inside the menu's <ul>. No props, no emits.
-->
<template>
  <li><h6 class="dropdown-header px-2">Appearance</h6></li>
  <li class="px-2 pb-2">
    <div class="appearance-mode-picker" role="radiogroup" aria-label="Appearance mode">
      <button
        v-for="mode in APPEARANCE_MODES"
        :key="mode.value"
        type="button"
        role="radio"
        class="appearance-mode pressable"
        :class="{ selected: theme.themeMode === mode.value }"
        :aria-checked="theme.themeMode === mode.value"
        :data-testid="`appearance-${mode.value}`"
        @click="theme.setThemeMode(mode.value)"
      >
        <i class="bi" :class="mode.icon" aria-hidden="true"></i>
        <span>{{ mode.label }}</span>
      </button>
    </div>
    <label class="auto-night-toggle d-flex align-items-center justify-content-between gap-3 mt-3">
      <span>
        <span class="d-block fw-semibold small">Switch to night mode automatically</span>
        <span class="d-block appearance-hint small text-muted">Dark at 8 PM · light at 6 AM</span>
      </span>
      <input
        class="form-check-input m-0"
        type="checkbox"
        role="switch"
        aria-label="Switch to night mode automatically"
        data-testid="appearance-auto-toggle"
        :checked="theme.themeMode === 'auto'"
        @change="onAutoToggleChange"
      />
    </label>
  </li>
  <li><h6 class="dropdown-header px-2">{{ modeName }} backgrounds</h6></li>
  <li class="px-2 pb-2">
    <div class="bg-picker" role="radiogroup" :aria-label="`${modeName} background`" data-testid="bg-picker">
      <button
        v-for="bg in theme.visibleBackgrounds"
        :key="bg.id"
        type="button"
        role="radio"
        class="bg-swatch pressable"
        :class="{ selected: theme.background === bg.id }"
        :data-bg-preview="bg.id"
        :aria-checked="theme.background === bg.id"
        :aria-label="bg.label"
        :title="bg.label"
        :data-testid="`bg-${bg.id}`"
        :style="swatchStyle(bg)"
        @click="theme.setBackground(bg.id)"
      ></button>
    </div>
    <div class="mt-3">
      <label class="form-label small fw-semibold mb-1" for="background-theme">Wallpaper appearance</label>
      <select id="background-theme" v-model="uploadTheme" class="form-select form-select-sm mb-2">
        <option value="light">Light backgrounds</option>
        <option value="dark">Dark backgrounds</option>
      </select>
      <input ref="backgroundFile" type="file" class="d-none" accept="image/png,image/jpeg,image/webp" aria-label="Choose a wallpaper image" @change="saveUploadedBackground" />
      <button type="button" class="btn btn-sm btn-outline-primary w-100" data-testid="add-custom-wallpaper" @click="openFilePicker">
        <i class="bi bi-image me-1" aria-hidden="true"></i>Add custom wallpaper
      </button>
      <div v-if="backgroundMessage" class="small mt-1" :class="backgroundError ? 'text-danger' : 'text-success'" role="status">{{ backgroundMessage }}</div>
      <div v-if="customBackgrounds.length" class="custom-background-list mt-2">
        <div v-for="bg in customBackgrounds" :key="bg.id" class="d-flex align-items-center justify-content-between gap-2 small">
          <span class="text-truncate">{{ bg.label }}</span>
          <button type="button" class="btn btn-sm btn-link text-danger p-0" :aria-label="`Remove ${bg.label}`" @click="removeBackground(bg.id)">Remove</button>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useThemeStore } from '../../stores/theme'

const theme = useThemeStore()

const APPEARANCE_MODES = [
  { value: 'light', label: 'Light', icon: 'bi-sun' },
  { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
]

const modeName = computed(() => (theme.isDark ? 'Dark' : 'Light'))
const customBackgrounds = computed(() => theme.visibleBackgrounds.filter((bg) => bg.custom))

// The auto toggle: on = follow the clock, off = fall back to light
function onAutoToggleChange(event) {
  theme.setThemeMode(event.target.checked ? 'auto' : 'light')
}

// Swatches with a preview image show it as the button background
function swatchStyle(bg) {
  if (!bg.preview) return {}
  return { backgroundImage: `url(${bg.preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
}

// --- Custom wallpaper upload ---
const uploadTheme = ref('light') // which set (light or dark) the new wallpaper is saved to
const backgroundMessage = ref('')
const backgroundError = ref(false)

// Beyond WAD2 syllabus: a template ref (ref="backgroundFile" in the template) lets the
// styled "Add custom wallpaper" button open the hidden file input.
const backgroundFile = ref(null)

function openFilePicker() {
  backgroundFile.value?.click()
}

// Shrinks a picture (max 1400x1000) and returns it as a small JPEG data URL,
// so it fits in localStorage. Uses a plain <canvas> element from the browser.
async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, 1400 / bitmap.width, 1000 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * ratio)
  canvas.height = Math.round(bitmap.height * ratio)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.78)
}

function showBackgroundMessage(text, isError) {
  backgroundMessage.value = text
  backgroundError.value = isError
}

async function saveUploadedBackground(event) {
  const file = event.target.files?.[0]
  showBackgroundMessage('', false)
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showBackgroundMessage('Choose a JPG, PNG, or WebP image.', true)
    event.target.value = ''
    return
  }
  try {
    const image = await shrinkImage(file)
    const label = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'My photo'
    const result = theme.addCustomBackground(image, uploadTheme.value, label)
    if (result.error) throw new Error(result.error)
    showBackgroundMessage(`Saved to ${uploadTheme.value} backgrounds.`, false)
  } catch (err) {
    showBackgroundMessage(err.message || 'Could not save this image.', true)
  } finally {
    // Clear the input so choosing the same file again still fires a change event
    event.target.value = ''
  }
}

function removeBackground(id) {
  theme.removeCustomBackground(id)
  showBackgroundMessage('Custom background removed.', false)
}
</script>

<style scoped>
.appearance-mode-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-1);
  padding: var(--s-1);
  border-radius: var(--r-md);
  background: var(--fb-bg);
}
.appearance-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: var(--s-2) var(--s-1);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--fb-text-2);
  font-size: .72rem;
  font-weight: 700;
  white-space: nowrap;
}
.appearance-mode.selected {
  border-color: var(--fb-hairline);
  background: var(--fb-surface);
  color: var(--fb-text);
  box-shadow: var(--fb-shadow-sm);
}
.appearance-mode i {
  font-size: 1rem;
}
.appearance-hint {
  line-height: 1.35;
}
.bg-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--s-2);
}
.bg-swatch {
  aspect-ratio: 1;
  min-width: 36px;
  border-radius: var(--r-sm);
  border: 1px solid var(--fb-hairline);
  padding: 0;
  transition: box-shadow 150ms ease, transform var(--dur-press) var(--ease-out);
}
.bg-swatch.selected {
  box-shadow: 0 0 0 2px var(--fb-surface), 0 0 0 4px var(--fb-green-600);
}
</style>
