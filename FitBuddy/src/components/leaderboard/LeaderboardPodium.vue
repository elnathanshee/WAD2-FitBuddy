<!--
  The podium for the top 3 athletes. The parent passes the three entries already
  in display order (2nd, 1st, 3rd) so the winner stands in the middle.
  Props: entries (3 leaderboard entries), ranks (Map of userId -> rank).
-->
<template>
  <section class="podium" aria-label="Top three">
    <div
      v-for="entry in entries"
      :key="entry.userId"
      v-tilt
      class="podium-spot"
      :class="`place-${ranks.get(entry.userId)}`"
    >
      <span class="avatar podium-avatar" :style="{ backgroundColor: entry.avatarColor }">
        {{ entry.displayName.charAt(0).toUpperCase() }}
      </span>
      <div class="podium-name">{{ entry.displayName }}</div>
      <div class="podium-points">{{ entry.points }} pts</div>
      <div class="podium-step display-num" aria-hidden="true">{{ ranks.get(entry.userId) }}</div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  entries: { type: Array, required: true },
  ranks: { type: Map, required: true },
})
</script>

<style scoped>
.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: end;
  gap: var(--s-3);
}
.podium-spot {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
  animation: rise-up 480ms var(--ease-out) backwards;
}
.place-1 { animation-delay: 80ms; }
.place-3 { animation-delay: 160ms; }
@keyframes rise-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.podium-avatar {
  width: 56px;
  height: 56px;
  font-size: 1.3rem;
  box-shadow: 0 0 0 3px var(--fb-bg);
}
.place-1 .podium-avatar {
  width: 68px;
  height: 68px;
  font-size: 1.5rem;
}
.podium-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-md);
  margin-top: var(--s-2);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.podium-points {
  font-size: 0.8rem;
  color: var(--fb-text-2);
  font-weight: 600;
  margin-bottom: var(--s-2);
}
.podium-step {
  width: 100%;
  border-radius: var(--r-md) var(--r-md) 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--s-3);
  font-size: 2.2rem;
  color: var(--fb-text-2);
  background: var(--fb-surface);
  border: 1px solid var(--fb-hairline);
  border-bottom: 0;
}
.place-1 .podium-step {
  height: 112px;
  color: #f5f3ee;
  background: var(--fb-green-solid);
  border-color: var(--fb-green-solid);
}
.place-2 .podium-step {
  height: 84px;
}
.place-3 .podium-step {
  height: 64px;
}

@media (max-width: 575.98px) {
  .podium {
    gap: var(--s-2);
  }
  .podium-avatar {
    width: 44px;
    height: 44px;
    font-size: 1.1rem;
  }
  .place-1 .podium-avatar {
    width: 54px;
    height: 54px;
  }
}
</style>
