<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <Navbar />
    <main class="flex-grow-1 page-transition">
      <RouterView />
    </main>
  </div>
</template>
