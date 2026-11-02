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
  =============================================================================
-->
<template>
  <!-- Teleported so the fixed button isn't moved by the page transition -->
  <Teleport to="body">
    <!-- Round coach button with an "Ask me anything!" prompt beside it -->
    <div class="coach-launcher">
      <Transition name="hint">
        <button v-if="!open" type="button" class="coach-hint" data-testid="coach-hint" tabindex="-1" @click="openChat">
          Ask me anything!
        </button>
      </Transition>
      <button
        ref="fabEl"
        type="button"
        class="coach-fab pressable"
        :class="{ 'is-open': open }"
        :aria-label="open ? 'Close the AI goal coach' : 'Ask the AI goal coach anything'"
        :aria-expanded="open"
        data-testid="ai-coach-btn"
        @click="open ? closeChat() : openChat()"
      >
        <Transition name="fab-icon" mode="out-in">
          <i v-if="open" key="close" class="bi bi-x-lg" aria-hidden="true"></i>
          <CoachFace v-else key="open" class="fab-face" />
        </Transition>
      </button>
    </div>

    <Transition name="scrim">
      <div v-if="open" class="coach-scrim" @click="closeChat"></div>
    </Transition>

    <Transition name="coach-panel">
      <section
        v-if="open"
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
            <div class="coach-status">{{ pending ? 'Thinking…' : 'Powered by Gemini' }}</div>
          </div>
          <button
            v-if="userTurns > 0"
            type="button"
            class="btn btn-sm head-btn"
            title="Start over"
            aria-label="Start a new conversation"
            @click="resetChat"
          >
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-sm head-btn" aria-label="Close" data-testid="coach-close" @click="closeChat">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <!-- Conversation -->
        <div ref="scrollEl" class="coach-body" aria-live="polite">
          <TransitionGroup name="bubble" tag="div" class="messages">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="msg"
              :class="`msg-${msg.role}`"
              data-testid="coach-message"
              :data-role="msg.role"
            >
              <div class="bubble">
                {{ msg.text }}
                <button
                  v-if="msg.role === 'error' && msg.retry"
                  type="button"
                  class="btn btn-sm btn-outline-danger mt-2 d-block"
                  @click="retry(msg)"
                >
                  Try again
                </button>
              </div>

              <!-- Habit suggestions attached to a coach reply -->
              <div v-if="msg.suggestions?.length" class="suggestions">
                <article
                  v-for="(habit, idx) in msg.suggestions"
                  :key="idx"
                  class="suggestion"
                  :class="{ added: isAdded(msg, idx) }"
                  data-testid="coach-suggestion"
                >
                  <span class="icon-tile suggestion-icon" aria-hidden="true">{{ habit.icon }}</span>
                  <div class="flex-grow-1 min-w-0">
                    <div class="suggestion-name">{{ habit.name }}</div>
                    <div class="suggestion-meta">
                      {{ habit.target.amount }} {{ habit.target.unit }} · <span class="text-capitalize">{{ habit.frequency }}</span>
                    </div>
                    <p v-if="habit.description" class="suggestion-desc">{{ habit.description }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm add-btn"
                    :class="isAdded(msg, idx) ? 'btn-tinted' : 'btn-primary'"
                    :disabled="isAdded(msg, idx) || addingKey === keyFor(msg, idx)"
                    data-testid="coach-add-btn"
                    @click="addHabit(msg, idx)"
                  >
                    <Transition name="morph" mode="out-in">
                      <span v-if="isAdded(msg, idx)" key="added"><i class="bi bi-check2" aria-hidden="true"></i> Added</span>
                      <span v-else-if="addingKey === keyFor(msg, idx)" key="adding">
                        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      </span>
                      <span v-else key="add"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add</span>
                    </Transition>
                  </button>
                </article>
                <button
                  v-if="unaddedCount(msg) > 1"
                  type="button"
                  class="btn btn-sm btn-outline-primary align-self-start"
                  :disabled="addingKey !== null"
                  data-testid="coach-add-all"
                  @click="addAll(msg)"
                >
                  <i class="bi bi-plus-circle me-1" aria-hidden="true"></i>Add all {{ unaddedCount(msg) }}
                </button>
              </div>
            </div>

            <div v-if="pending" key="typing" class="msg msg-model" data-testid="coach-typing">
              <div class="bubble typing" aria-label="Coach is typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </TransitionGroup>

          <!-- Starter prompts before the first message -->
          <div v-if="userTurns === 0 && !pending" class="chips">
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
        <div v-if="needsKey" class="key-row">
          <label for="coach-key" class="small fw-semibold mb-1 d-block">
            <i class="bi bi-key me-1" aria-hidden="true"></i>Gemini API key
          </label>
          <input
            id="coach-key"
            v-model="apiKey"
            type="password"
            class="form-control form-control-sm"
            placeholder="Paste your AI Studio key (AIza…)"
            @change="saveApiKey"
          />
        </div>

        <!-- Composer -->
        <form class="composer" @submit.prevent="send(draft)">
          <input
            ref="inputEl"
            v-model="draft"
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
            :disabled="!draft.trim() || pending"
            aria-label="Send"
            data-testid="coach-send"
          >
            <i class="bi bi-arrow-up" aria-hidden="true"></i>
          </button>
        </form>
      </section>
    </Transition>
  </Teleport>
</template>

<script>
// Conversation state lives at module level so closing the panel or leaving
// the page doesn't wipe the chat (it resets on a full reload).
import { ref } from 'vue'

const GREETING = {
  id: 'greeting',
  role: 'model',
  text: "Hi! I'm your goal coach. Tell me what you'd like to achieve and I'll suggest habits to get you there.",
}
const messages = ref([{ ...GREETING }])
const addedKeys = ref(new Set())
let nextId = 1
</script>

<script setup>
import { computed, nextTick, onUnmounted, watch } from 'vue'
import CoachFace from './CoachFace.vue'
import { aiService } from '../../services/aiService'
import { habitService, errorMessage } from '../../services/habitService'

const emit = defineEmits(['saved'])

const STARTERS = [
  'I want to sleep better',
  'Help me get fit for a 5K',
  'I want to study more consistently',
  'I need to reduce stress',
]
const API_KEY_STORAGE = 'fitbuddy_gemini_api_key'

const open = ref(false)
const draft = ref('')
const pending = ref(false)
const addingKey = ref(null)
const needsKey = ref(false)
const apiKey = ref(readStoredKey())

const fabEl = ref(null)
const inputEl = ref(null)
const scrollEl = ref(null)

const userTurns = computed(() => messages.value.filter((m) => m.role === 'user').length)

function readStoredKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

function saveApiKey() {
  try {
    if (apiKey.value.trim()) localStorage.setItem(API_KEY_STORAGE, apiKey.value.trim())
    else localStorage.removeItem(API_KEY_STORAGE)
  } catch {
    // storage blocked: the key still works for this session
  }
}

// ---- Open / close ----------------------------------------------------------

function onKeydown(event) {
  if (event.key === 'Escape') closeChat()
}

async function openChat() {
  open.value = true
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  scrollToBottom(false)
  inputEl.value?.focus()
}

function closeChat() {
  if (!open.value) return
  open.value = false
  window.removeEventListener('keydown', onKeydown)
  fabEl.value?.focus()
}

onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function resetChat() {
  messages.value = [{ ...GREETING }]
  addedKeys.value = new Set()
  draft.value = ''
  inputEl.value?.focus()
}

// ---- Conversation ----------------------------------------------------------

function scrollToBottom(smooth = true) {
  const el = scrollEl.value
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' })
}

watch(
  () => [messages.value.length, pending.value],
  () => nextTick(() => scrollToBottom()),
)

// The turns Gemini sees: user and coach messages (not the greeting or errors).
// Suggested habit names are appended so the coach knows what it already offered.
function conversationForApi() {
  return messages.value
    .filter((m) => (m.role === 'user' || m.role === 'model') && m.id !== 'greeting')
    .map((m) => ({
      role: m.role,
      text: m.suggestions?.length
        ? `${m.text}\n(Suggested habits: ${m.suggestions.map((s) => s.name).join(', ')})`
        : m.text,
    }))
}

async function send(text) {
  const message = String(text || '').trim()
  if (!message || pending.value) return
  draft.value = ''
  messages.value.push({ id: nextId++, role: 'user', text: message })
  await requestReply()
}

async function requestReply() {
  pending.value = true
  try {
    const { reply, suggestions } = await aiService.coachChat(conversationForApi(), apiKey.value.trim() || undefined)
    needsKey.value = false
    messages.value.push({ id: nextId++, role: 'model', text: reply, suggestions })
  } catch (err) {
    const text = errorMessage(err)
    if (/api key/i.test(text)) needsKey.value = true
    messages.value.push({
      id: nextId++,
      role: 'error',
      text: needsKey.value ? 'Add a Gemini API key below, then try again.' : text,
      retry: true,
    })
  } finally {
    pending.value = false
  }
}

function retry(errorMsg) {
  messages.value = messages.value.filter((m) => m !== errorMsg)
  requestReply()
}

// ---- Adding suggested habits -----------------------------------------------

const keyFor = (msg, idx) => `${msg.id}-${idx}`
const isAdded = (msg, idx) => addedKeys.value.has(keyFor(msg, idx))
const unaddedCount = (msg) => msg.suggestions.filter((_, idx) => !isAdded(msg, idx)).length

async function createHabit(msg, idx) {
  const habit = msg.suggestions[idx]
  addingKey.value = keyFor(msg, idx)
  await habitService.create({
    name: habit.name,
    category: habit.category,
    frequency: habit.frequency,
    target: habit.target,
    icon: habit.icon,
  })
  addedKeys.value = new Set(addedKeys.value).add(keyFor(msg, idx))
}

async function addHabit(msg, idx) {
  try {
    await createHabit(msg, idx)
    emit('saved')
  } catch (err) {
    messages.value.push({ id: nextId++, role: 'error', text: errorMessage(err) })
  } finally {
    addingKey.value = null
  }
}

async function addAll(msg) {
  try {
    for (let idx = 0; idx < msg.suggestions.length; idx++) {
      if (!isAdded(msg, idx)) await createHabit(msg, idx)
    }
  } catch (err) {
    messages.value.push({ id: nextId++, role: 'error', text: errorMessage(err) })
  } finally {
    addingKey.value = null
    emit('saved')
  }
}

defineExpose({ openChat })
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}

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

/* ---------- Panel ---------- */
.coach-scrim {
  display: none;
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

/* ---------- Messages ---------- */
.msg {
  display: flex;
  flex-direction: column;
  max-width: 88%;
}
.msg-user {
  align-self: flex-end;
  align-items: flex-end;
  transform-origin: bottom right;
}
.msg-model,
.msg-error {
  align-self: flex-start;
  transform-origin: bottom left;
}
.bubble {
  padding: var(--s-2) var(--s-3);
  border-radius: 18px;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.msg-user .bubble {
  color: #fff;
  background: var(--fb-green-600);
  border-bottom-right-radius: 6px;
}
.msg-model .bubble {
  background: var(--fb-surface);
  border: 1px solid var(--fb-hairline);
  border-bottom-left-radius: 6px;
}
.msg-error .bubble {
  color: #b42318;
  background: #fef3f2;
  border-bottom-left-radius: 6px;
}

.bubble-enter-active {
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
}
.bubble-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
.bubble-leave-active {
  display: none;
}

/* Typing indicator */
.typing {
  display: inline-flex;
  gap: var(--s-1);
  padding: var(--s-3) var(--s-4);
}
.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--fb-text-3);
  animation: typing 1s ease-in-out infinite;
}
.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

/* Suggestions */
.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin-top: var(--s-2);
  width: 100%;
}
.suggestion {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--fb-surface);
  border: 1px solid var(--fb-hairline);
  box-shadow: var(--fb-shadow-sm);
  transition: border-color 200ms ease, background-color 200ms ease;
}
.suggestion.added {
  border-color: var(--fb-green-200);
  background: var(--fb-green-50);
}
.suggestion-icon {
  width: 36px;
  height: 36px;
  font-size: 1.1rem;
  background: var(--fb-surface-2);
}
.suggestion-name {
  font-weight: 600;
  font-size: 0.88rem;
}
.suggestion-meta {
  font-size: 0.75rem;
  color: var(--fb-text-2);
}
.suggestion-desc {
  font-size: 0.78rem;
  color: var(--fb-text-2);
  margin: var(--s-1) 0 0;
}
.add-btn {
  min-width: 74px;
  flex-shrink: 0;
}
.morph-enter-active,
.morph-leave-active {
  transition: opacity 140ms ease, filter 140ms ease;
}
.morph-enter-from,
.morph-leave-to {
  opacity: 0;
  filter: blur(2px);
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
  .bubble-enter-from {
    transform: none;
  }
  .fab-icon-enter-from,
  .fab-icon-leave-to {
    transform: none;
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
