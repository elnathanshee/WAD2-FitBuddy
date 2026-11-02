<!--
  "Cheers for you": the latest cheers and nudges other athletes sent you.
  Props: cheers (array of { id, type, sender_name, sender_color }).
-->
<template>
  <section v-reveal class="surface p-3 px-md-4">
    <h2 class="section-title mb-2">Cheers for you</h2>
    <ul class="cheers-list divided list-unstyled mb-0">
      <li v-for="ch in cheers" :key="ch.id">
        <span class="avatar" :style="{ width: '24px', height: '24px', fontSize: '11px', backgroundColor: ch.sender_color || '#4F46E5' }">
          {{ (ch.sender_name || '?').charAt(0) }}
        </span>
        <span><strong>{{ ch.sender_name }}</strong> {{ CHEER_TEXT[ch.type] || 'boosted you' }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup>
defineProps({
  cheers: { type: Array, required: true },
})

// What each cheer type says after the sender's name
const CHEER_TEXT = { cheer: 'cheered you on', nudge: 'nudged you', fire: 'sent you a boost', celebrate: 'celebrated you' }
</script>

<style scoped>
.cheers-list li {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) 0;
  font-size: 0.9rem;
}
</style>
