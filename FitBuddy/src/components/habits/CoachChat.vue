<!--
  =============================================================================
  [IS216 Project Addition: AI Goal Coach chatbot]
  Technology: Vue 3 (<script setup>), Bootstrap Icons, Axios → Express → Gemini

  A floating button (bottom-right of the Habits page) opens a chat panel.
  The user describes a goal; the coach (POST /api/ai/coach-chat) replies and,
  once it understands the goal, suggests habits that can be added in one tap.
  The whole conversation is sent each turn so the coach remembers context.
  - md+: a panel anchored to the button (grows out of it)
  - < md: a bottom sheet with a dimming scrim

  This component is the floating button, the scrim and the open/close animation.
  The chat window itself is CoachPanel.vue (conversation in stores/coachChat.js).
  Props: open (is the chat open? the parent page owns this)
  Emits: open (button clicked to open), close (button/scrim/X/Escape to close),
         saved (a suggested habit was added, so the page should reload its habits)
  =============================================================================
-->
<template>
  <!-- Beyond WAD2 syllabus: <Teleport> puts the fixed button on <body> so the page's
       route animation can't move it and it stays above everything else. -->
  <Teleport to="body">
    <!-- Round coach button with an "Ask me anything!" prompt beside it -->
    <div class="coach-launcher">
      <!-- Beyond WAD2 syllabus: <Transition> plays the "hint" fade-out when the chat opens
           (and the delayed fade-in when it closes). CSS alone cannot animate an element
           that Vue has already removed. -->
      <Transition name="hint">
        <button v-if="!open" type="button" class="coach-hint" data-testid="coach-hint" tabindex="-1" @click="emit('open')">
          Ask me anything!
        </button>
      </Transition>
      <button
        id="coach-fab"
        type="button"
        class="coach-fab pressable"
        :class="{ 'is-open': open }"
        :aria-label="open ? 'Close the AI goal coach' : 'Ask the AI goal coach anything'"
        :aria-expanded="open"
        data-testid="ai-coach-btn"
        @click="open ? closeChat() : emit('open')"
      >
        <!-- Beyond WAD2 syllabus: <Transition mode="out-in"> swaps the face and the X icon
             one after the other with a small spin. -->
        <Transition name="fab-icon" mode="out-in">
          <i v-if="open" key="close" class="bi bi-x-lg" aria-hidden="true"></i>
          <CoachFace v-else key="open" class="fab-face" />
        </Transition>
      </button>
    </div>

    <!-- Beyond WAD2 syllabus: <Transition> lets the scrim and the panel animate out
         after Vue removes them (CSS alone cannot play a leave animation). -->
    <Transition name="scrim">
      <div v-if="open" class="coach-scrim" @click="closeChat"></div>
    </Transition>

    <!-- v-if re-creates the panel on every open, so its onMounted (focus, scroll) runs each time -->
    <Transition name="coach-panel">
      <CoachPanel v-if="open" @close="closeChat" @saved="emit('saved')" />
    </Transition>
  </Teleport>
</template>

<script setup>
import CoachFace from './CoachFace.vue'
import CoachPanel from './CoachPanel.vue'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'close', 'saved'])

function closeChat() {
  emit('close')
  // Give the keyboard focus back to the round button, like a normal dialog
  document.getElementById('coach-fab')?.focus()
}
</script>

<style scoped>
/* ---------- Floating button ---------- */
.coach-launcher {
  position: fixed;
  right: var(--s-6);
  bottom: var(--s-6);
  z-index: 1040;
  display: flex;
  align-items: center;
  gap: var(--s-3);
}
.coach-fab {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  color: #f5f3ee;
  font-size: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--fb-green-solid);
  box-shadow: var(--fb-shadow-lg);
  transition: transform var(--dur-press) var(--ease-out), background-color 150ms ease;
  animation: fab-in 320ms var(--ease-out) backwards;
}
.coach-fab.is-open {
  font-size: var(--fs-lg);
}
@keyframes fab-in {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
.coach-fab:active {
  transform: scale(0.94);
}
@media (hover: hover) and (pointer: fine) {
  .coach-fab:hover {
    background: var(--fb-green-600);
  }
}
/* A one-time "hello" wiggle when the face first appears */
.fab-face {
  animation: wave 900ms var(--ease-out) 400ms backwards;
  transform-origin: 50% 80%;
}
@keyframes wave {
  0% { transform: rotate(0); }
  25% { transform: rotate(-14deg); }
  50% { transform: rotate(10deg); }
  75% { transform: rotate(-6deg); }
  100% { transform: rotate(0); }
}

/* "Ask me anything!" speech bubble, pointing at the button */
.coach-hint {
  position: relative;
  border: 1px solid var(--fb-hairline);
  border-radius: var(--r-lg);
  padding: var(--s-2) var(--s-4);
  background: var(--fb-surface);
  color: var(--fb-text);
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 600;
  white-space: nowrap;
  box-shadow: var(--fb-shadow-md);
  transform-origin: right center;
}
.coach-hint::after {
  content: '';
  position: absolute;
  right: -7px;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--fb-surface);
  border-top: 1px solid var(--fb-hairline);
  border-right: 1px solid var(--fb-hairline);
  transform: translateY(-50%) rotate(45deg);
}
.hint-enter-active {
  transition: opacity 220ms var(--ease-out) 500ms, transform 260ms var(--ease-out) 500ms;
}
.hint-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.96);
}

.fab-icon-enter-active,
.fab-icon-leave-active {
  transition: opacity 120ms ease, transform 160ms var(--ease-out);
}
.fab-icon-enter-from {
  opacity: 0;
  transform: rotate(-45deg) scale(0.8);
}
.fab-icon-leave-to {
  opacity: 0;
  transform: rotate(45deg) scale(0.8);
}

/* ---------- Panel open / close animation (the panel's own look is in CoachPanel.vue) ---------- */
.coach-scrim {
  display: none;
}
.coach-panel-enter-active {
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
}
.coach-panel-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.coach-panel-enter-from,
.coach-panel-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

/* ---------- Phones: panel becomes a bottom sheet ---------- */
@media (max-width: 767.98px) {
  .coach-launcher {
    right: var(--s-4);
    bottom: calc(var(--s-4) + env(safe-area-inset-bottom));
  }
  .coach-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1045;
    background: rgba(0, 0, 0, 0.3);
  }
  .scrim-enter-active,
  .scrim-leave-active {
    transition: opacity var(--dur-panel) ease;
  }
  .scrim-enter-from,
  .scrim-leave-to {
    opacity: 0;
  }

  .coach-panel-enter-active {
    transition: transform var(--dur-panel) var(--ease-drawer);
  }
  .coach-panel-leave-active {
    transition: transform 200ms var(--ease-drawer);
  }
  .coach-panel-enter-from,
  .coach-panel-leave-to {
    opacity: 1;
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .coach-panel-enter-active,
  .coach-panel-leave-active {
    transition: opacity 150ms ease;
  }
  .coach-panel-enter-from,
  .coach-panel-leave-to {
    opacity: 0;
    transform: none;
  }
  .fab-icon-enter-from,
  .fab-icon-leave-to {
    transform: none;
  }
}
</style>
