<!--
  One habit card suggested by the coach, with an "Add" button.
  Props: habit (the suggested habit), added (already saved?), adding (saving right now?)
  Emits: add (the user tapped "Add")
-->
<template>
  <article class="suggestion" :class="{ added }" data-testid="coach-suggestion">
    <span class="icon-tile suggestion-icon" aria-hidden="true">{{ habit.icon }}</span>
    <div class="flex-grow-1 min-w-0">
      <div class="suggestion-name">{{ habit.name }}</div>
      <div class="suggestion-meta">
        {{ habit.target.amount }} {{ habit.target.unit }} · <span class="text-capitalize">{{ habit.frequency }}</span>
      </div>
      <p v-if="habit.description" class="suggestion-desc">{{ habit.description }}</p>
    </div>
    <button
      type="button"
      class="btn btn-sm add-btn"
      :class="added ? 'btn-tinted' : 'btn-primary'"
      :disabled="added || adding"
      data-testid="coach-add-btn"
      @click="emit('add')"
    >
      <!-- Beyond WAD2 syllabus: <Transition> cross-fades the button label (Add / spinner / Added).
           CSS alone cannot animate the old label leaving, because Vue removes it from the page. -->
      <Transition name="morph" mode="out-in">
        <span v-if="added" key="added"><i class="bi bi-check2" aria-hidden="true"></i> Added</span>
        <span v-else-if="adding" key="adding">
          <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        </span>
        <span v-else key="add"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add</span>
      </Transition>
    </button>
  </article>
</template>

<script setup>
defineProps({
  habit: { type: Object, required: true },
  added: { type: Boolean, default: false },
  adding: { type: Boolean, default: false },
})

const emit = defineEmits(['add'])
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.suggestion {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--fb-surface);
  border: 1px solid var(--fb-hairline);
  box-shadow: var(--fb-shadow-sm);
  transition: border-color 200ms ease, background-color 200ms ease;
}
.suggestion.added {
  border-color: var(--fb-green-200);
  background: var(--fb-green-50);
}
.suggestion-icon {
  width: 36px;
  height: 36px;
  font-size: 1.1rem;
  background: var(--fb-surface-2);
}
.suggestion-name {
  font-weight: 600;
  font-size: 0.88rem;
}
.suggestion-meta {
  font-size: 0.75rem;
  color: var(--fb-text-2);
}
.suggestion-desc {
  font-size: 0.78rem;
  color: var(--fb-text-2);
  margin: var(--s-1) 0 0;
}
.add-btn {
  min-width: 74px;
  flex-shrink: 0;
}
.morph-enter-active,
.morph-leave-active {
  transition: opacity 140ms ease, filter 140ms ease;
}
.morph-enter-from,
.morph-leave-to {
  opacity: 0;
  filter: blur(2px);
}
</style>
