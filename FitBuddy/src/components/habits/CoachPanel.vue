<!--
  The open AI coach chat window: header, conversation, starter chips,
  optional API key box and the message box. The conversation itself lives in
  the coachChat store, so this panel can be created and destroyed freely.
  CoachChat.vue shows this panel with v-if, so onMounted below runs every time
  the chat is opened.
  Emits: close (X button or Escape key), saved (a suggested habit was added)
-->
<template>
  <section
    class="coach-panel"
    role="dialog"
    aria-modal="false"
    aria-labelledby="coach-title"
    data-testid="coach-panel"
  >
    <!-- Header -->
    <header class="coach-head">
      <span class="coach-avatar" aria-hidden="true"><CoachFace /></span>
      <div class="flex-grow-1 min-w-0">
        <h2 id="coach-title" class="coach-title">AI Goal Coach</h2>
        <div class="coach-status">{{ chat.pending ? 'Thinking…' : 'Powered by Gemini' }}</div>
      </div>
      <button
        v-if="chat.userTurns > 0"
        type="button"
        class="btn btn-sm head-btn"
        title="Start over"
        aria-label="Start a new conversation"
        @click="startOver"
      >
        <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
      </button>
      <button type="button" class="btn btn-sm head-btn" aria-label="Close" data-testid="coach-close" @click="emit('close')">
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </header>

    <!-- Conversation -->
    <div ref="bodyEl" class="coach-body" aria-live="polite">
      <div class="messages">
        <CoachMessage
          v-for="(msg, index) in chat.messages"
          :key="msg.id"
          :msg="msg"
          :animate="index >= messageCountAtOpen"
          @retry="retry(msg)"
          @add="(idx) => addHabit(msg, idx)"
          @add-all="addAll(msg)"
        />
        <CoachMessage v-if="chat.pending" typing animate />
      </div>

      <!-- Starter prompts before the first message -->
      <div v-if="chat.userTurns === 0 && !chat.pending" class="chips">
        <button
          v-for="chip in STARTERS"
          :key="chip"
          type="button"
          class="chip pressable"
          data-testid="coach-chip"
          @click="send(chip)"
        >
          {{ chip }}
        </button>
      </div>
    </div>

    <!-- API key (only when the server has none configured) -->
    <div v-if="chat.needsKey" class="key-row">
      <label for="coach-key" class="small fw-semibold mb-1 d-block">
        <i class="bi bi-key me-1" aria-hidden="true"></i>Gemini API key
      </label>
      <input
        id="coach-key"
        v-model="chat.apiKey"
        type="password"
        class="form-control form-control-sm"
        placeholder="Paste your AI Studio key (AIza…)"
        @change="chat.saveApiKey"
      />
    </div>

    <!-- Composer -->
    <form class="composer" @submit.prevent="send(chat.draft)">
      <input
        ref="inputEl"
        v-model="chat.draft"
        type="text"
        class="composer-input"
        placeholder="Tell the coach your goal…"
        maxlength="1000"
        aria-label="Message the coach"
        data-testid="coach-input"
      />
      <button
        type="submit"
        class="send-btn pressable"
        :disabled="!chat.draft.trim() || chat.pending"
        aria-label="Send"
        data-testid="coach-send"
      >
        <i class="bi bi-arrow-up" aria-hidden="true"></i>
      </button>
    </form>
  </section>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import CoachFace from './CoachFace.vue'
import CoachMessage from './CoachMessage.vue'
import { useCoachChatStore } from '../../stores/coachChat'

const emit = defineEmits(['close', 'saved'])

const STARTERS = [
  'I want to sleep better',
  'Help me get fit for a 5K',
  'I want to study more consistently',
  'I need to reduce stress',
]

const chat = useCoachChatStore()

// Messages that already exist when the panel opens do not slide in again;
// only messages added after this point get the animation.
const messageCountAtOpen = chat.messages.length

// Beyond WAD2 syllabus: template refs are Vue's way to reach an element (to focus the
// input and to scroll the message area) instead of document.getElementById.
const inputEl = ref(null)
const bodyEl = ref(null)

// ---- Opening and closing ----

// Pressing Escape closes the chat, even when the cursor is not inside it
function closeOnEscape(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  // Beyond WAD2 syllabus: a window-level key listener (and onUnmounted below to remove it)
  // is the only way to catch Escape when focus is outside the chat. Without removing it,
  // the listener would keep running after the panel is gone.
  window.addEventListener('keydown', closeOnEscape)
  scrollToBottom(false)
  focusInput()
})

onUnmounted(() => window.removeEventListener('keydown', closeOnEscape))

function focusInput() {
  inputEl.value?.focus()
}

function startOver() {
  chat.resetChat()
  focusInput()
}

// ---- Conversation ----

// Keeps the newest message in view
async function scrollToBottom(smooth = true) {
  // Beyond WAD2 syllabus: nextTick waits until Vue has drawn the new message,
  // otherwise we would scroll before it exists and miss the bottom.
  await nextTick()
  const body = bodyEl.value
  if (!body) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  body.scrollTo({ top: body.scrollHeight, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' })
}

// Asks the coach for a reply, scrolling when the typing dots appear and when the reply arrives
async function getReply() {
  const waiting = chat.requestReply()
  scrollToBottom()
  await waiting
  scrollToBottom()
}

async function send(text) {
  if (!chat.addUserMessage(text)) return
  scrollToBottom()
  await getReply()
}

async function retry(errorMsg) {
  chat.removeMessage(errorMsg)
  await getReply()
}

// ---- Adding suggested habits ----

async function addHabit(msg, idx) {
  const saved = await chat.addHabit(msg, idx)
  if (saved) emit('saved')
  else scrollToBottom() // an error message was added
}

async function addAll(msg) {
  await chat.addAll(msg)
  emit('saved')
  scrollToBottom()
}
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}

.coach-panel {
  position: fixed;
  right: var(--s-6);
  bottom: calc(var(--s-6) + 60px + var(--s-4)); /* just above the button */
  z-index: 1050;
  width: 384px;
  height: min(560px, calc(100vh - var(--fb-nav-h) - 140px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--r-xl);
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(252, 251, 248, 0.97);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
  box-shadow: var(--fb-shadow-lg);
  transform-origin: bottom right; /* grows out of the button */
}
html[data-theme='dark'] .coach-panel {
  border-color: var(--fb-hairline);
  background: rgba(35, 38, 33, 0.97);
}

.coach-head {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-4) var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--fb-hairline);
}
.coach-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f5f3ee;
  background: var(--fb-green-solid);
  font-size: 26px;
  flex-shrink: 0;
}
.coach-title {
  font-size: var(--fs-lg);
  font-weight: 600;
  letter-spacing: 0;
  margin: 0;
}
.coach-status {
  font-size: 0.75rem;
  color: var(--fb-text-2);
}
.head-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  color: var(--fb-text-2);
  background: rgba(0, 0, 0, 0.05);
}
html[data-theme='dark'] .head-btn {
  background: rgba(255, 255, 255, 0.06);
}

.coach-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--s-4);
}
.messages {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

/* Starter chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: var(--s-4);
}
.chip {
  border: 1px solid var(--fb-green-200);
  background: var(--fb-surface);
  color: var(--fb-green-700);
  font-size: 0.82rem;
  font-weight: 600;
  padding: var(--s-2) var(--s-3);
  border-radius: 999px;
}
@media (hover: hover) and (pointer: fine) {
  .chip {
    transition: background-color 150ms ease, transform var(--dur-press) var(--ease-out);
  }
  .chip:hover {
    background: var(--fb-green-50);
  }
}

.key-row {
  padding: var(--s-3) var(--s-4) 0;
  border-top: 1px solid var(--fb-hairline);
}

/* Composer */
.composer {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3);
  border-top: 1px solid var(--fb-hairline);
}
.key-row + .composer {
  border-top: 0;
}
.composer-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 var(--s-4);
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: var(--fb-surface);
  font-size: 0.92rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
html[data-theme='dark'] .composer-input {
  border-color: #53584f;
}
.composer-input:focus {
  outline: none;
  border-color: var(--fb-green-400);
  box-shadow: 0 0 0 3px rgba(var(--fb-green-rgb), 0.18);
}
.send-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--fb-green-600);
  font-size: 1.05rem;
  transition: background-color 150ms ease, opacity 150ms ease, transform var(--dur-press) var(--ease-out);
}
.send-btn:disabled {
  opacity: 0.4;
}
.send-btn:active:not(:disabled) {
  transform: scale(0.92);
}

/* ---------- Phones: panel becomes a bottom sheet ---------- */
@media (max-width: 767.98px) {
  .coach-panel {
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    height: min(86vh, 640px);
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    border-bottom: 0;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--fb-surface-2);
    transform-origin: bottom center;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .coach-panel {
    background: var(--fb-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
