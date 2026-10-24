<!--
  Dashboard: the user's statistics only — completion rates, charts and streaks
  for a day, week or month. Today's view lives on Home.
-->
<template>
  <div class="container py-4 py-md-5" style="max-width: 1080px;">
    <header class="mb-4">
      <h1 class="page-title">Your stats</h1>
      <p class="page-subtitle">Completion, trends and streaks across your habits.</p>
    </header>

    <AnalyticsDashboard />
  </div>
</template>

<script setup>
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard.vue'
</script>
