<!--
  Edit profile: change your display name and avatar colour.
  Props down (the current user), events up ('saved' with the updated user, or
  'close'), so the navbar stays in charge of opening and closing this modal.
-->
<template>
  <AppModal title="Edit profile" @close="emit('close')">
    <form @submit.prevent="save">
      <div class="mb-3">
        <label class="form-label fw-semibold" for="profile-name">Display name</label>
        <input
          id="profile-name"
          ref="nameInput"
          v-model="name"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': nameError }"
          maxlength="60"
          placeholder="How your name appears to friends"
          data-testid="profile-name-input"
        />
        <div v-if="nameError" class="invalid-feedback">{{ nameError }}</div>
      </div>

      <div class="mb-3">
        <span class="form-label fw-semibold d-block">Avatar colour</span>
        <div class="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar colour">
          <button
            v-for="colour in AVATAR_COLORS"
            :key="colour"
            type="button"
            class="colour-swatch"
            :class="{ selected: colour === avatarColor }"
            :style="{ backgroundColor: colour }"
            role="radio"
            :aria-checked="colour === avatarColor"
            :aria-label="`Avatar colour ${colour}`"
            :data-testid="`profile-colour-${colour.replace('#', '')}`"
            @click="avatarColor = colour"
          ></button>
        </div>
      </div>

      <!-- Live preview of how the avatar will look in the navbar -->
      <div class="d-flex align-items-center gap-2">
        <span class="avatar-preview" :style="{ backgroundColor: avatarColor }">{{ initial }}</span>
        <span class="text-muted small">This is how friends will see you</span>
      </div>

      <p v-if="error" class="text-danger small mt-3 mb-0" data-testid="profile-error">{{ error }}</p>
    </form>

    <template #footer>
      <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="emit('close')">
        Cancel
      </button>
      <button type="button" class="btn btn-primary" :disabled="saving" data-testid="profile-save-btn" @click="save">
        <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
        Save changes
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppModal from '../habits/AppModal.vue'
import { useAuthStore } from '../../stores/auth'
import { errorMessage } from '../../services/habitService'

const props = defineProps({
  // The logged-in user, from the auth store
  user: { type: Object, required: true },
})
const emit = defineEmits(['saved', 'close'])
const auth = useAuthStore()

// The same eight colours the server accepts (see AVATAR_COLORS in
// server/controllers/authController.js). Anything else is rejected with a 400.
const AVATAR_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EC4899',
  '#8B5CF6', '#06B6D4', '#EF4444', '#14B8A6',
]

const name = ref(props.user.name ?? '')
const avatarColor = ref(props.user.avatarColor || AVATAR_COLORS[0])
const nameError = ref('')
const error = ref('')
const saving = ref(false)
// Beyond WAD2 syllabus: a template ref (ref="nameInput" in the template) gives us the
// input element so we can focus it as soon as the modal opens.
const nameInput = ref(null)

onMounted(() => nameInput.value?.focus())

const initial = computed(() => (name.value.trim()[0] || '?').toUpperCase())

// The same rules the server checks, so a mistake is caught before the request.
// The server still validates everything and its message wins if it disagrees.
function validate() {
  const trimmed = name.value.trim()
  if (trimmed.length < 2) return 'Your name needs at least 2 characters.'
  if (trimmed.length > 60) return 'Your name must be 60 characters or fewer.'
  return ''
}

async function save() {
  nameError.value = validate()
  error.value = ''
  if (nameError.value) return

  saving.value = true
  try {
    const user = await auth.updateProfile(name.value.trim(), avatarColor.value)
    emit('saved', user)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.colour-swatch {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.colour-swatch.selected {
  box-shadow: 0 0 0 2px var(--fb-surface), 0 0 0 4px var(--fb-text);
}
.avatar-preview {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
}
</style>
