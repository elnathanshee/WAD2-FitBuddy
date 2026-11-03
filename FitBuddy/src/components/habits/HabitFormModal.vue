<!--
  Create / edit form in a modal. Pass `habit` to edit it (the form is
  pre-filled), or leave it null to create a new habit. Saves through the API
  itself, then emits `saved` so the page can refresh its list.
-->
<template>
  <AppModal :title="isEditing ? 'Edit habit' : 'New habit'" @close="emit('close')">
    <form novalidate data-testid="habit-form" @submit.prevent="save">
      <div
        v-if="error"
        class="alert alert-danger py-2 small"
        role="alert"
        data-testid="habit-form-error"
      >
        <i class="bi bi-exclamation-triangle-fill me-1" aria-hidden="true"></i>{{ error }}
      </div>

      <div class="mb-3">
        <label for="habit-name" class="form-label fw-semibold">Name</label>
        <input
          id="habit-name"
          v-model="form.name"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': nameError }"
          maxlength="50"
          placeholder="e.g. Drink water"
          data-testid="habit-name-input"
          @input="onNameInput"
        />
        <div v-if="nameSuggestion" class="form-text text-success mt-1" data-testid="habit-name-suggestion">
          <i class="bi bi-magic me-1" aria-hidden="true"></i>Suggested {{ nameSuggestion }} from the name. You can change any field.
        </div>
      </div>

      <div class="mb-3">
        <span class="form-label fw-semibold d-block">Emoji</span>
        <EmojiPickerField :model-value="form.icon" @update:model-value="updateIcon" />
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6">
          <label for="habit-category" class="form-label fw-semibold">Category</label>
          <select
            id="habit-category"
            v-model="form.category"
            class="form-select"
            data-testid="habit-category-select"
            @change="markEdited('category')"
          >
            <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="col-6">
          <label for="habit-frequency" class="form-label fw-semibold">Frequency</label>
          <select
            id="habit-frequency"
            v-model="form.frequency"
            class="form-select"
            data-testid="habit-frequency-select"
            @change="markEdited('frequency')"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      <div v-if="form.category === 'other'" class="mb-3">
        <label for="habit-custom-category" class="form-label fw-semibold">Your category</label>
        <input
          id="habit-custom-category"
          v-model="form.customCategory"
          type="text"
          class="form-control"
          maxlength="30"
          placeholder="e.g. Meditation, Finance, Reading"
          data-testid="habit-custom-category-input"
          @input="markEdited('customCategory')"
        />
      </div>

      <fieldset v-if="form.frequency === 'weekly'" class="mb-3" data-testid="habit-custom-days">
        <legend class="form-label fw-semibold fs-6 mb-1">
          Custom days <span class="text-muted fw-normal small">(optional)</span>
        </legend>
        <div class="d-flex flex-wrap gap-1" role="group" aria-label="Custom days of the week">
          <button
            v-for="day in WEEK_DAYS"
            :key="day.value"
            type="button"
            class="btn btn-sm"
            :class="form.customDays.includes(day.value) ? 'btn-primary' : 'btn-outline-secondary'"
            :aria-pressed="form.customDays.includes(day.value)"
            :data-testid="`habit-custom-day-${day.value}`"
            @click="toggleCustomDay(day.value)"
          >
            {{ day.label }}
          </button>
        </div>
        <div class="form-text">
          <template v-if="form.customDays.length">
            Scheduled on: <strong>{{ form.customDays.join(', ') }}</strong>
          </template>
          <template v-else>
            Pick specific day(s) of the week for this weekly habit, or leave unselected for any day.
          </template>
        </div>
      </fieldset>

      <fieldset class="mb-3">
        <legend class="form-label fw-semibold fs-6" data-testid="habit-target-label">
          {{ form.frequency === 'weekly' ? 'Weekly target' : 'Daily target' }}
        </legend>
        <div class="input-group">
          <input
            id="habit-target-amount"
            v-model.number="form.targetAmount"
            type="number"
            min="0.01"
            step="any"
            inputmode="decimal"
            class="form-control"
            aria-label="Target amount"
            data-testid="habit-target-amount-input"
            @input="markEdited('targetAmount')"
          />
          <select
            id="habit-target-unit"
            v-model="form.targetUnit"
            class="form-select"
            aria-label="Unit"
            data-testid="habit-target-unit-select"
            @change="markEdited('targetUnit')"
          >
            <optgroup v-for="group in UNIT_GROUPS" :key="group.label" :label="group.label">
              <option v-for="unit in group.units" :key="unit" :value="unit">{{ unit }}</option>
            </optgroup>
            <option :value="CUSTOM">Other…</option>
          </select>
        </div>
        <input
          v-if="form.targetUnit === CUSTOM"
          v-model="form.customUnit"
          type="text"
          maxlength="20"
          class="form-control mt-2"
          placeholder="Your unit, e.g. laps"
          aria-label="Custom unit"
          data-testid="habit-custom-unit-input"
          @input="markEdited('customUnit')"
        />
        <div class="form-text">
          <template v-if="form.frequency === 'weekly'">
            Your total for the week (Monday–Sunday), e.g. 150 minutes. Log on any day — it all adds up.
          </template>
          <template v-else>What counts as "done" each day, e.g. 8 glasses or 2.5 km.</template>
        </div>
      </fieldset>

      <div class="d-flex justify-content-end gap-2 border-top pt-3 mt-4">
        <button type="button" class="btn btn-outline-secondary" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-primary px-4" :disabled="saving" data-testid="habit-save-btn">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          {{ isEditing ? 'Save changes' : 'Create habit' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppModal from './AppModal.vue'
import EmojiPickerField from './EmojiPickerField.vue'
import { habitService, errorMessage } from '../../services/habitService'
import {
  CATEGORIES, PRESET_CATEGORY_VALUES, UNIT_GROUPS, ALL_UNITS, CUSTOM, WEEK_DAYS, roundAmount,
  suggestHabitSettings,
} from '../../utils/habitOptions'

const props = defineProps({
  habit: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'close'])

const isEditing = computed(() => props.habit !== null)

// A saved category/unit that isn't one of the presets was typed by the user,
// so the form shows "Other" with the text box filled in.
const savedCategory = props.habit?.category ?? 'exercise'
const isPresetCategory = PRESET_CATEGORY_VALUES.includes(savedCategory)
const savedUnit = props.habit?.target.unit ?? 'times'
const isPresetUnit = ALL_UNITS.includes(savedUnit)

// Flat copy of the habit's fields, so editing doesn't change the card until saved.
const form = ref({
  name: props.habit?.name ?? '',
  category: isPresetCategory ? savedCategory : 'other',
  customCategory: isPresetCategory || savedCategory === 'other' ? '' : savedCategory,
  frequency: props.habit?.frequency ?? 'daily',
  customDays: Array.isArray(props.habit?.customDays) ? [...props.habit.customDays] : [],
  targetAmount: props.habit?.target.amount ?? 1,
  targetUnit: isPresetUnit ? savedUnit : CUSTOM,
  customUnit: isPresetUnit ? '' : savedUnit,
  icon: props.habit?.icon ?? '✅',
})

function toggleCustomDay(dayValue) {
  const current = new Set(form.value.customDays)
  if (current.has(dayValue)) {
    current.delete(dayValue)
  } else {
    current.add(dayValue)
  }
  form.value.customDays = WEEK_DAYS.map((d) => d.value).filter((d) => current.has(d))
}

// The starting values, used when a name has no suggestion (or the suggestion is cleared)
const defaults = {
  category: form.value.category,
  customCategory: form.value.customCategory,
  frequency: form.value.frequency,
  targetAmount: form.value.targetAmount,
  targetUnit: form.value.targetUnit,
  customUnit: form.value.customUnit,
  icon: form.value.icon,
}
// Fields the user changed by hand: name suggestions must not overwrite these
const manuallyEdited = ref({
  category: false,
  customCategory: false,
  frequency: false,
  targetAmount: false,
  targetUnit: false,
  customUnit: false,
  icon: false,
})
const nameSuggestion = ref('')

function markEdited(field) {
  manuallyEdited.value[field] = true
}

function updateIcon(value) {
  form.value.icon = value
  markEdited('icon')
}

function applyNameSuggestion(name) {
  const suggestion = suggestHabitSettings(name)
  nameSuggestion.value = suggestion
    ? `${suggestion.icon} ${suggestion.category === 'other' ? suggestion.customCategory : suggestion.category}, ${suggestion.frequency}, ${suggestion.amount} ${suggestion.unit}`
    : ''

  const values = {
    icon: suggestion?.icon ?? defaults.icon,
    category: suggestion?.category ?? defaults.category,
    customCategory: suggestion?.customCategory ?? defaults.customCategory,
    frequency: suggestion?.frequency ?? defaults.frequency,
    targetAmount: suggestion?.amount ?? defaults.targetAmount,
    targetUnit: suggestion?.unit ?? defaults.targetUnit,
    customUnit: defaults.customUnit,
  }
  for (const [field, value] of Object.entries(values)) {
    if (!manuallyEdited.value[field]) form.value[field] = value
  }
}

// The name only changes when the user types (form.value.name is never set in code),
// so the suggestion runs from the input event.
function onNameInput(event) {
  applyNameSuggestion(event.target.value)
}

const error = ref('')
const nameError = ref(false)
const saving = ref(false)

// Checks the same rules as the server, so most mistakes are caught instantly.
// The server still validates everything, and its message is shown if it disagrees.
function validate() {
  nameError.value = form.value.name.trim() === ''
  if (nameError.value) return 'Please give your habit a name.'
  if (typeof form.value.targetAmount !== 'number' || !(roundAmount(form.value.targetAmount) > 0)) {
    return 'Target must be a number more than 0.'
  }
  if (form.value.targetUnit === CUSTOM && form.value.customUnit.trim() === '') {
    return 'Please type your unit, or pick one from the list.'
  }
  return ''
}

async function save() {
  error.value = validate()
  if (error.value) return

  const payload = {
    name: form.value.name.trim(),
    // An empty custom category is saved as plain "other"
    category: form.value.category === 'other' ? form.value.customCategory.trim() || 'other' : form.value.category,
    frequency: form.value.frequency,
    customDays: form.value.frequency === 'weekly' ? form.value.customDays : [],
    target: {
      amount: roundAmount(form.value.targetAmount),
      unit: form.value.targetUnit === CUSTOM ? form.value.customUnit.trim() : form.value.targetUnit,
    },
    icon: form.value.icon,
  }

  saving.value = true
  try {
    const saved = isEditing.value
      ? await habitService.update(props.habit._id, payload)
      : await habitService.create(payload)
    emit('saved', saved)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>
