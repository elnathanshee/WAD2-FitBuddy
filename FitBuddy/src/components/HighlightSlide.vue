<!--
  One card of the highlights carousel (see HighlightsCarousel.vue).
  Shows a big number (counting up if it is a number), a caption and an optional link.
  Props:
    slide    { eyebrow, value (number|string), unit?, caption, note?, to?, linkLabel?, tone, icon }
    position this card's number in the list (1-based), used for the screen-reader label
    total    how many cards there are
-->
<template>
  <article
    class="slide"
    :class="`tone-${slide.tone}`"
    role="group"
    aria-roledescription="slide"
    :aria-label="`${position} of ${total}: ${slide.eyebrow}`"
    data-testid="carousel-slide"
    v-tilt
  >
    <span class="slide-orb" aria-hidden="true"></span>
    <i class="bi slide-icon" :class="slide.icon" aria-hidden="true"></i>
    <div class="eyebrow slide-eyebrow">{{ slide.eyebrow }}</div>
    <div class="slide-value display-num">
      <CountUp v-if="typeof slide.value === 'number'" :value="slide.value" />
      <template v-else>{{ slide.value }}</template>
      <small v-if="slide.unit">{{ slide.unit }}</small>
    </div>
    <p class="slide-caption">
      {{ slide.caption }}
      <span v-if="slide.note" class="d-block fw-bold">{{ slide.note }}</span>
    </p>
    <router-link v-if="slide.to" :to="slide.to" class="slide-link" draggable="false">
      {{ slide.linkLabel }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
    </router-link>
  </article>
</template>

<script setup>
import CountUp from './CountUp.vue'

defineProps({
  slide: { type: Object, required: true },
  position: { type: Number, required: true },
  total: { type: Number, required: true },
})
</script>

<style scoped>
.slide {
  position: relative;
  flex: 0 0 85%;
  scroll-snap-align: start;
  min-height: 184px;
  padding: var(--s-6);
  border-radius: var(--r-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid transparent;
  box-shadow: var(--fb-shadow-card);
}
@media (min-width: 768px) {
  .slide {
    flex-basis: calc((100% - var(--s-4)) / 2);
  }
}
@media (min-width: 1200px) {
  .slide {
    flex-basis: calc((100% - 2 * var(--s-4)) / 3);
  }
}

/* Vibrant tones. Each pairing keeps text contrast at 4.5:1 or better. */
.tone-green { background: #11864f; color: #ffffff; }
.tone-amber { background: #ffb21e; color: #3d2300; }
.tone-blue { background: #1f6fe5; color: #ffffff; }
.tone-coral { background: #d93d30; color: #ffffff; }
.tone-purple { background: #7c4ddb; color: #ffffff; }

/* A big soft circle in the corner adds depth and a playful shape */
.slide::before {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  right: -64px;
  top: -72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  pointer-events: none;
}
.slide-orb {
  position: absolute;
  width: 120px;
  height: 120px;
  right: 24px;
  bottom: -72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.tone-amber::before {
  background: rgba(255, 255, 255, 0.3);
}

.slide-icon {
  position: absolute;
  z-index: 1;
  right: var(--s-6);
  top: var(--s-6);
  font-size: var(--fs-2xl);
  opacity: 0.9;
}
.slide > :not(.slide-icon):not(.slide-orb) {
  position: relative; /* above the decorative circles */
}
.slide-eyebrow {
  color: inherit;
  opacity: 0.8;
}
.slide-value {
  font-size: var(--fs-4xl);
  margin-top: var(--s-2);
}
.slide-value small {
  font-family: var(--font-body);
  font-size: var(--fs-md);
  font-weight: 700;
  margin-left: var(--s-1);
  opacity: 0.8;
}
.slide-caption {
  margin: var(--s-2) 0 0;
  font-size: var(--fs-sm);
  opacity: 0.85;
}
.slide-link {
  margin-top: auto;
  padding-top: var(--s-4);
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  font-weight: 800;
  font-size: var(--fs-sm);
  color: inherit;
  text-decoration: none;
  align-self: flex-start;
}
.slide-link i {
  transition: transform var(--dur-ui) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .slide-link:hover i {
    transform: translateX(4px);
  }
}
</style>
