<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div class="app-shell d-flex flex-column min-vh-100">
    <Navbar />
    <main class="flex-grow-1">
      <!--
        Beyond WAD2 syllabus: a plain <RouterView /> would swap pages instantly. This
        longer form (RouterView's slot + <Transition> + <component :is>) lets the old
        page fade out before the new page fades in. The animation classes are
        .route-enter-active / .route-leave-active in assets/main.css.
      -->
      <RouterView v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>
