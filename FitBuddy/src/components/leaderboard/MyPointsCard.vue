<!--
  "Your points this week" card: the 3D trophy, the big animated total and the
  breakdown (completions, perfect days, streak milestones).
  Props: me (the score object from leaderboardService.myScore).
-->
<template>
  <section class="surface my-points p-4">
    <Trophy3D class="my-trophy" />
    <div class="flex-grow-1">
      <div class="eyebrow">Your points this week</div>
      <div class="points-big display-num"><CountUp :value="me.total" /><span class="pts"> pts</span></div>
    </div>
    <ul class="breakdown list-unstyled mb-0">
      <li><i class="bi bi-check-circle-fill text-success" aria-hidden="true"></i><strong>{{ me.completions }}</strong> completions × {{ me.rules.COMPLETION }}</li>
      <li><i class="bi bi-calendar-check-fill" style="color: var(--fb-blue)" aria-hidden="true"></i><strong>{{ me.allDailyDays }}</strong> perfect days × {{ me.rules.ALL_DAILY }}</li>
      <li><i class="bi bi-fire" style="color: var(--fb-amber)" aria-hidden="true"></i><strong>{{ me.milestones }}</strong> 7-day milestones × {{ me.rules.STREAK_MILESTONE }}</li>
    </ul>
  </section>
</template>

<script setup>
import CountUp from '../CountUp.vue'
import Trophy3D from '../three/Trophy3D.vue'

defineProps({
  me: { type: Object, required: true },
})
</script>

<style scoped>
.my-points {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-4) var(--s-6);
}
.my-trophy {
  margin: calc(var(--s-4) * -1) 0;
}
.points-big {
  font-size: 4rem;
  color: var(--fb-green-700);
  margin-top: var(--s-1);
}
.points-big .pts {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: var(--fb-text-2);
}
.breakdown {
  display: grid;
  gap: var(--s-1);
  font-size: 0.85rem;
  color: var(--fb-text-2);
}
.breakdown i {
  margin-right: var(--s-2);
}
.breakdown strong {
  color: var(--fb-text);
}
</style>
