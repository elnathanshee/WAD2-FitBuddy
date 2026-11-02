<!--
  Auto-advancing carousel of highlight cards (Home page).
  Props: label (heading text), slides (array of card data, see HighlightSlide.vue).
  - Advances every INTERVAL ms; the active dot fills up to show the timer.
  - Pauses while hovered, focused, touched, or while the tab is hidden, and
    never auto-advances with prefers-reduced-motion.
  - Swipe (touch, native scroll-snap) or drag with a mouse: on release the
    carousel projects the drag's momentum to choose the next slide, so a quick
    flick moves on even if the drag was short.
  - Prev/next buttons and dots for keyboard and pointer users.
-->
<template>
  <section
    class="carousel"
    aria-roledescription="carousel"
    :aria-label="label"
    data-testid="highlights-carousel"
    :data-active-index="active"
    @pointerenter="hovering = true"
    @pointerleave="hovering = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <div class="carousel-head">
      <h2 class="section-title">{{ label }}</h2>
      <div class="controls">
        <button type="button" class="ctrl pressable" aria-label="Previous highlight" data-testid="carousel-prev" @click="go(active - 1, true)">
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
        </button>
        <button type="button" class="ctrl pressable" aria-label="Next highlight" data-testid="carousel-next" @click="go(active + 1, true)">
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- Beyond WAD2 syllabus: a template ref gives the script the scrolling row, so it can scroll it and measure the cards. -->
    <div
      ref="track"
      class="track"
      :class="{ dragging }"
      @scroll.passive="onScroll"
      @pointerdown="onPointerDown"
      @touchstart.passive="touchPause"
    >
      <HighlightSlide
        v-for="(slide, i) in slides"
        :key="slide.id"
        :slide="slide"
        :position="i + 1"
        :total="slides.length"
      />
    </div>

    <div class="dots" role="tablist" aria-label="Choose a highlight">
      <button
        v-for="i in stops.length"
        :key="i"
        type="button"
        role="tab"
        class="dot"
        :class="{ active: i - 1 === active, running: i - 1 === active && playing }"
        :style="{ '--interval': `${INTERVAL}ms` }"
        :aria-selected="i - 1 === active"
        :aria-label="`Show highlight ${i}`"
        data-testid="carousel-dot"
        @click="go(i - 1, true)"
      >
        <span :key="`${active}-${cycle}`"></span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import HighlightSlide from './HighlightSlide.vue'

const props = defineProps({
  label: { type: String, required: true },
  // [{ id, eyebrow, value (number|string), unit?, caption, note?, to?, linkLabel?, tone, icon }]
  slides: { type: Array, required: true },
})

const INTERVAL = 4500
const IDLE_AFTER_INTERACTION = 8000

const track = ref(null)
const active = ref(0)
const hovering = ref(false)
const focused = ref(false)
const dragging = ref(false)
const tabHidden = ref(document.hidden)
const pausedUntil = ref(0) // after a manual interaction, wait before auto-playing again
const cycle = ref(0) // restarts the dot's fill animation
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playing = computed(
  () => !reduceMotion && !hovering.value && !focused.value && !dragging.value && !tabHidden.value && stops.value.length > 1,
)

// ---- Positioning ----------------------------------------------------------
// The scroll positions the track can actually reach. With several cards on
// screen at once, the last few cards can't scroll to the left edge, so there
// are fewer stops (and dots) than cards.
const stops = ref([0])

function slideEls() {
  return track.value ? [...track.value.children] : []
}

function measureStops() {
  const els = slideEls()
  if (!els.length) return
  const max = track.value.scrollWidth - track.value.clientWidth
  const points = []
  for (const el of els) {
    const left = Math.min(el.offsetLeft - els[0].offsetLeft, max)
    if (!points.length || left - points[points.length - 1] > 1) points.push(left)
  }
  stops.value = points
  if (active.value > points.length - 1) active.value = points.length - 1
}

function go(index, manual = false) {
  if (!track.value) return
  const n = stops.value.length
  const target = ((index % n) + n) % n
  // Scroll the track itself (not scrollIntoView, which would also scroll the page)
  const left = stops.value[target]
  track.value.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' })
  active.value = target
  cycle.value++
  if (manual) pausedUntil.value = Date.now() + IDLE_AFTER_INTERACTION
}

// Keep `active` in sync when the user swipes or scrolls natively
let scrollTimer = 0
function onScroll() {
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    if (!track.value) return
    const best = nearestStop(track.value.scrollLeft)
    if (best !== active.value) {
      active.value = best
      cycle.value++
    }
  }, 80)
}

function touchPause() {
  pausedUntil.value = Date.now() + IDLE_AFTER_INTERACTION
}

// ---- Mouse drag with momentum (touch uses native scrolling) --------------
let dragStartX = 0
let dragStartScroll = 0
let samples = []

function onPointerDown(e) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  dragging.value = true
  dragStartX = e.clientX
  dragStartScroll = track.value.scrollLeft
  samples = [{ x: e.clientX, t: performance.now() }]
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e) {
  track.value.scrollLeft = dragStartScroll - (e.clientX - dragStartX)
  samples.push({ x: e.clientX, t: performance.now() })
  if (samples.length > 5) samples.shift()
}

// Apple's momentum projection: where would the content coast to?
const project = (velocity, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate)

function onPointerUp(e) {
  window.removeEventListener('pointermove', onPointerMove)
  const moved = Math.abs(e.clientX - dragStartX)
  const first = samples[0]
  const last = samples[samples.length - 1]
  const velocity = last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0 // px/s
  dragging.value = false
  if (moved < 6) return // a click, not a drag
  // Swallow the click that follows a drag so links inside slides don't fire
  track.value.addEventListener('click', (ev) => ev.preventDefault(), { capture: true, once: true })
  go(nearestStop(track.value.scrollLeft - project(velocity)), true)
}

function nearestStop(x) {
  let best = 0
  stops.value.forEach((left, i) => {
    if (Math.abs(left - x) < Math.abs(stops.value[best] - x)) best = i
  })
  return best
}

// ---- Autoplay -------------------------------------------------------------
// A timer moves to the next card every INTERVAL ms; it is re-planned whenever
// something changes (hover, focus, drag, tab hidden, active card).
let timer = 0
function schedule() {
  clearTimeout(timer)
  if (!playing.value) return
  timer = setTimeout(() => {
    if (Date.now() < pausedUntil.value) {
      cycle.value++
      schedule()
      return
    }
    go(active.value + 1)
    schedule()
  }, INTERVAL)
}

// Beyond WAD2 syllabus: watch re-plans the autoplay timer whenever "playing" or the
// active card changes. These change from many places (hover, focus, drag, swipe, tab
// switch), so one watch is simpler than calling schedule() from each of them.
watch([playing, active], schedule)

// Beyond WAD2 syllabus: the browser's "visibilitychange" event tells us when the user
// switches to another browser tab, so autoplay can pause while nobody is looking.
const onVisibility = () => (tabHidden.value = document.hidden)

// Beyond WAD2 syllabus: ResizeObserver tells us when the row changes size (e.g. the
// window is resized) so the card positions are measured again.
let resizeObserver = null
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  measureStops()
  resizeObserver = new ResizeObserver(measureStops)
  resizeObserver.observe(track.value)
  schedule()
})
// Beyond WAD2 syllabus: when the number of cards changes, wait for Vue to draw the
// new cards (nextTick) and then measure them. Measuring earlier would miss them.
watch(
  () => props.slides.length,
  () => nextTick(measureStops),
)

// Beyond WAD2 syllabus: onUnmounted cancels the timers and listeners when the user
// leaves the page. Without it they would keep running in the background.
onUnmounted(() => {
  resizeObserver?.disconnect()
  clearTimeout(timer)
  clearTimeout(scrollTimer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointermove', onPointerMove)
})
</script>

<style scoped>
.carousel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--s-3);
}
.controls {
  display: flex;
  gap: var(--s-2);
}
.ctrl {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--fb-hairline);
  background: var(--fb-surface);
  color: var(--fb-text);
  box-shadow: var(--fb-shadow-card);
}

.track {
  display: flex;
  gap: var(--s-4);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  padding: var(--s-2) var(--s-1) var(--s-4);
  margin: 0 calc(var(--s-1) * -1);
  cursor: grab;
  user-select: none;
}
.track::-webkit-scrollbar {
  display: none;
}
.track.dragging {
  cursor: grabbing;
  scroll-snap-type: none; /* follow the mouse 1:1 while dragging */
}

/* Dots: the active one fills up over the autoplay interval */
.dots {
  display: flex;
  justify-content: center;
  gap: var(--s-2);
}
.dot {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dot span {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--fb-text-3);
  opacity: 0.45;
  transition: width var(--dur-ui) var(--ease-out), opacity var(--dur-ui) ease;
}
.dot.active span {
  width: 24px;
  opacity: 1;
  background: linear-gradient(90deg, var(--fb-green-600) 0 var(--fill, 100%), var(--fb-green-200) var(--fill, 100%) 100%);
}
.dot.running span {
  animation: dot-fill var(--interval) linear;
}
@property --fill {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}
@keyframes dot-fill {
  from { --fill: 0%; }
  to { --fill: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .dot.running span {
    animation: none;
  }
}
</style>
