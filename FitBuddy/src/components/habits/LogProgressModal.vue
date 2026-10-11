<!--
  Log progress for one habit today: type an amount (decimals allowed) or tap a
  quick chip, then "Log". "Edit today's total" fixes a mistake by setting the
  total directly. Emits `logged` after a successful save.
-->
<template>
  <AppModal :title="`${habit.icon} ${habit.name}`" size="sm" @close="emit('close')">
    <div data-testid="log-modal">
      <div class="text-center mb-3">
        <div class="text-muted small">{{ periodLabel(habit) }} so far</div>
        <div class="fs-3 fw-bold" data-testid="log-today-total">
          {{ formatAmount(habit.periodCount) }} / {{ formatAmount(habit.target.amount) }}
          <span class="fs-6 fw-normal text-muted">{{ habit.target.unit }}</span>
        </div>
        <div v-if="remaining <= 0" class="text-success small fw-semibold">
          <i class="bi bi-check-circle-fill me-1" aria-hidden="true"></i>Target reached {{ habit.frequency === 'weekly' ? 'this week' : 'for today' }}
        </div>
      </div>

      <div v-if="error" class="alert alert-danger py-2 small" role="alert" data-testid="log-error">{{ error }}</div>

      <!-- Normal mode: ADD an amount to today's total -->
      <form v-if="!editingTotal" novalidate @submit.prevent="logAmount">
        <label for="log-amount" class="form-label fw-semibold">How much did you do?</label>
        <div class="d-flex flex-wrap gap-2 mb-2">
          <button
            v-for="chip in chips"
            :key="chip.label"
            type="button"
            class="btn btn-sm rounded-pill"
            :class="amount === chip.value ? 'btn-dark' : 'btn-outline-secondary'"
            data-testid="log-chip"
            @click="amount = chip.value"
          >
            {{ chip.label }}
          </button>
        </div>
        <div class="input-group mb-3">
          <input
            id="log-amount"
            ref="amountInput"
            v-model.number="amount"
            type="number"
            min="0.01"
            step="any"
            inputmode="decimal"
            class="form-control"
            placeholder="Amount"
            data-testid="log-amount-input"
          />
          <span class="input-group-text">{{ habit.target.unit }}</span>
        </div>
        <button type="submit" class="btn btn-primary w-100" :disabled="saving" data-testid="log-submit-btn">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          Log {{ amountIsValid ? `${formatAmount(amount)} ${habit.target.unit}` : '' }}
        </button>
        <div class="text-center mt-3">
          <button
            type="button"
            class="btn btn-link btn-sm text-muted"
            data-testid="edit-total-link"
            @click="startEditTotal"
          >
            <i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit today's total
          </button>
        </div>
      </form>

      <!-- Fix-a-mistake mode: REPLACE today's total -->
      <form v-else novalidate @submit.prevent="saveTotal">
        <label for="edit-total" class="form-label fw-semibold">Today's correct amount</label>
        <div class="input-group mb-1">
          <input
            id="edit-total"
            v-model.number="total"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            class="form-control"
            data-testid="edit-total-input"
          />
          <span class="input-group-text">{{ habit.target.unit }}</span>
        </div>
        <div class="form-text mb-3">
          Replaces what you logged <strong>today</strong>{{ habit.frequency === 'weekly' ? ' (other days this week stay as they are)' : '' }}.
          Set to 0 to clear it.
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary flex-grow-1" @click="editingTotal = false">Back</button>
          <button type="submit" class="btn btn-primary flex-grow-1" :disabled="saving" data-testid="edit-total-save-btn">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            Save total
          </button>
        </div>
      </form>
    </div>
  </AppModal>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppModal from './AppModal.vue'
import { habitService, errorMessage } from '../../services/habitService'
import { toDateKey } from '../../utils/dates'
import { roundAmount, formatAmount, periodLabel } from '../../utils/habitOptions'
import { unlockSound } from '../../utils/celebrate'

const props = defineProps({
  // A habit from GET /api/habits, including todayCount and periodCount
  habit: { type: Object, required: true },
})
const emit = defineEmits(['logged', 'close'])

const amount = ref('')
const total = ref(0)
const editingTotal = ref(false)
const saving = ref(false)
const error = ref('')
const amountInput = ref(null)

onMounted(() => amountInput.value?.focus())

// What's left to reach the target for this period (today, or this week)
const remaining = computed(() => roundAmount(props.habit.target.amount - props.habit.periodCount))
const amountIsValid = computed(() => typeof amount.value === 'number' && roundAmount(amount.value) > 0)

// Quick amounts that fit the target's size: 1–5 for small targets, otherwise
// a quarter / half / all of it. Plus "Finish" for exactly what's left today.
const chips = computed(() => {
  const target = props.habit.target.amount
  const nice = (n) => (target >= 20 ? Math.round(n) : roundAmount(n))
  const values = target <= 5
    ? [1, 2, 3, 4, 5].filter((n) => n <= Math.max(1, target))
    : [nice(target / 4), nice(target / 2), target]
  const result = [...new Set(values)].filter((n) => n > 0).map((n) => ({ value: n, label: `+${formatAmount(n)}` }))
  if (remaining.value > 0 && !values.includes(remaining.value)) {
    result.push({ value: remaining.value, label: `Finish (+${formatAmount(remaining.value)})` })
  }
  return result
})

async function logAmount() {
  if (!amountIsValid.value) {
    error.value = 'Enter an amount more than 0.'
    return
  }
  unlockSound() // must happen during the click, so the victory sound can play later
  await run(() => habitService.logAmount(props.habit._id, toDateKey(), roundAmount(amount.value)))
}

function startEditTotal() {
  error.value = ''
  total.value = props.habit.todayCount
  editingTotal.value = true
}

async function saveTotal() {
  if (typeof total.value !== 'number' || total.value < 0) {
    error.value = 'Enter a total of 0 or more.'
    return
  }
  unlockSound()
  await run(() => habitService.setTotal(props.habit._id, toDateKey(), roundAmount(total.value)))
}

async function run(action) {
  error.value = ''
  saving.value = true
  try {
    await action()
    emit('logged')
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>
