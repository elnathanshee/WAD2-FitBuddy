<!--
  Shows the chosen emoji as a button; clicking it opens a searchable picker
  with every emoji (emoji-picker-element). Use with v-model.
-->
<template>
  <div>
    <button
      type="button"
      class="btn btn-outline-secondary emoji-button"
      :aria-expanded="open"
      aria-label="Choose emoji"
      data-testid="habit-emoji-btn"
      @click="open = !open"
    >
      <span class="emoji-preview" data-testid="habit-emoji-value">{{ modelValue }}</span>
      <i class="bi small ms-1" :class="open ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
    </button>

    <div v-show="open" class="picker-wrap mt-2">
      <emoji-picker ref="picker" class="light" :data-source="dataSource" @emoji-click="choose"></emoji-picker>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import 'emoji-picker-element' // registers the <emoji-picker> web component
// The emoji list is bundled with the app instead of loaded from a CDN.
import dataSource from 'emoji-picker-element-data/en/emojibase/data.json?url'

defineProps({
  modelValue: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)

function choose(event) {
  emit('update:modelValue', event.detail.unicode)
  open.value = false
}
</script>

<style scoped>
.emoji-button {
  display: inline-flex;
  align-items: center;
  height: 2.75rem;
}
.emoji-preview {
  font-size: 1.6rem;
  line-height: 1;
}
emoji-picker {
  width: 100%;
  height: 320px;
  --num-columns: 8;
  --emoji-size: 1.5rem;
  --border-radius: 0.5rem;
}
</style>
