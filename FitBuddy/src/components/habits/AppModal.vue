<!--
  A Bootstrap modal whose visibility is controlled by Vue (render it with v-if)
  instead of Bootstrap's JavaScript, so Vue stays the single source of truth.
  Closes on the × button, the Escape key, or a click on the dark backdrop.
-->
<template>
  <!--
    Beyond WAD2 syllabus: <Teleport> moves the modal out to <body>, so it always
    sits on top of the page and is never clipped by a parent's CSS.
  -->
  <Teleport to="body">
    <div
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="emit('close')"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable app-modal-dialog" :class="sizeClass">
        <div class="modal-content border-0">
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
    <div class="modal-backdrop show app-modal-backdrop"></div>
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

// Beyond WAD2 syllabus: the Escape key is listened for on the whole window (not
// with @keydown.esc on the modal) so it works even before the user clicks inside
// the modal. The listener must be removed in onUnmounted, otherwise it would stay
// active after the modal closes.
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

<style>
/* Unscoped: the modal is teleported to <body>. Modals open from the centre
   (not anchored to a trigger); they appear quickly and close instantly. */
.app-modal-dialog {
  animation: app-modal-in 220ms var(--ease-out) backwards;
}
.app-modal-dialog .modal-content {
  box-shadow: var(--fb-shadow-lg);
}
.app-modal-backdrop {
  animation: app-backdrop-in 200ms ease backwards;
}
@keyframes app-modal-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes app-backdrop-in {
  from { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes app-modal-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
</style>
