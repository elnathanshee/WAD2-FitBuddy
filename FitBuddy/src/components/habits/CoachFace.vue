<!-- The coach's face: a smiling speech bubble (says "chat", feels welcoming) -->
<template>
  <svg class="coach-face" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path
      d="M16 4C9.4 4 4 8.9 4 15c0 3.2 1.5 6.1 4 8.1V28l4.6-2.6c1.1.3 2.2.4 3.4.4 6.6 0 12-4.9 12-10.8S22.6 4 16 4z"
      :fill="fill"
    />
    <circle cx="11.6" cy="13.8" r="1.9" :fill="ink" />
    <circle cx="20.4" cy="13.8" r="1.9" :fill="ink" />
    <path d="M11 18.4c1.3 1.8 3 2.7 5 2.7s3.7-.9 5-2.7" :stroke="ink" stroke-width="2.2" fill="none" stroke-linecap="round" />
  </svg>
</template>

<script setup>
defineProps({
  fill: { type: String, default: '#f5f3ee' },
  ink: { type: String, default: '#1b6343' },
})
</script>

<style scoped>
.coach-face {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
