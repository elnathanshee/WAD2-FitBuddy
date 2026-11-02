<!--
  The small pill message at the top of the Leaderboard ("You cheered Alex!").
  It drops in from the top and leaves the same way.
  Props: toast ({ text, kind: 'success' | 'info' } or null to hide it).
-->
<template>
  <!-- Beyond WAD2 syllabus: Teleport moves the toast to <body> so it floats above every
       other layer; Transition gives it the drop-in AND the drop-out animation
       (a plain CSS animation could only do the drop-in, because v-if removes the element at once). -->
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast" class="lb-toast" :class="`lb-toast-${toast.kind}`" role="status" data-testid="leaderboard-toast">
        <i class="bi" :class="iconClass" aria-hidden="true"></i>
        {{ toast.text }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  toast: { type: Object, default: null },
})

const iconClass = computed(() => (props.toast?.kind === 'info' ? 'bi-clock-history' : 'bi-megaphone-fill'))
</script>

<style scoped>
.lb-toast {
  position: fixed;
  top: calc(var(--fb-nav-h) + 12px);
  left: 50%;
  z-index: 1060;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  max-width: calc(100vw - 32px);
  padding: var(--s-3) var(--s-4);
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: rgba(28, 27, 24, 0.94);
  box-shadow: var(--fb-shadow-lg);
  transform: translateX(-50%);
}
.lb-toast-success i {
  color: var(--fb-green-400);
}
.lb-toast-info i {
  color: var(--fb-yellow);
}
.toast-enter-active {
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
}
.toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-from,
  .toast-leave-to {
    transform: translateX(-50%);
  }
}
</style>
