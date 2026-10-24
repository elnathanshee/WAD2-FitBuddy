<!--
  A number that counts up to its value (and re-counts from the old value when
  it changes). Rendered with tabular figures so the width doesn't jitter.
  Respects reduced motion by showing the final value straight away.
-->
<template>
  <span class="count-up">{{ formatted }}</span>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 900 }, // ms
})

const shown = ref(0)
let frame = 0

const formatted = computed(() =>
  shown.value.toLocaleString(undefined, {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  }),
)

// easeOutCubic: fast start, gentle landing
const ease = (t) => 1 - Math.pow(1 - t, 3)

function animateTo(to) {
  cancelAnimationFrame(frame)
  const from = shown.value
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
    shown.value = to
    return
  }
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / props.duration)
    shown.value = from + (to - from) * ease(t)
    if (t < 1) frame = requestAnimationFrame(tick)
    else shown.value = to
  }
  frame = requestAnimationFrame(tick)
}

onMounted(() => animateTo(Number(props.value) || 0))
watch(
  () => props.value,
  (v) => animateTo(Number(v) || 0),
)
onUnmounted(() => cancelAnimationFrame(frame))
</script>

<style scoped>
.count-up {
  font-variant-numeric: tabular-nums;
}
</style>
