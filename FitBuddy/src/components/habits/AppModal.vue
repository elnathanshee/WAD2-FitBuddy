<!--
  A Bootstrap modal whose visibility is controlled by Vue (render it with v-if)
  instead of Bootstrap's JavaScript, so Vue stays the single source of truth.
  Closes on the × button, the Escape key, or a click on the dark backdrop.
-->
<template>
  <Teleport to="body">
    <div
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="emit('close')"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" :class="sizeClass">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 :id="titleId" class="modal-title fw-bold">{{ title }}</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="emit('close')"></button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop show"></div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, useId } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  size: { type: String, default: '' }, // '', 'sm' or 'lg'
})
const emit = defineEmits(['close'])

const titleId = useId()
const sizeClass = computed(() => (props.size ? `modal-${props.size}` : ''))

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

// Stop the page behind the modal from scrolling, like Bootstrap does.
onMounted(() => {
  document.body.classList.add('modal-open')
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.body.classList.remove('modal-open')
  window.removeEventListener('keydown', onKeydown)
})
</script>
