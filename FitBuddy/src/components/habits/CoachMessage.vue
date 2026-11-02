<!--
  One chat bubble in the coach conversation (user, coach, or error), plus the
  habit suggestions attached to a coach reply. With `typing` it shows the
  three-dots "coach is typing" bubble instead.
  Props: msg (the message), typing (show the typing dots), animate (slide in when added)
  Emits: retry (error "Try again" button), add (idx of a suggestion), add-all
-->
<template>
  <div
    v-if="typing"
    class="msg msg-model"
    :class="{ 'bubble-in': animate }"
    data-testid="coach-typing"
  >
    <div class="bubble typing" aria-label="Coach is typing">
      <span></span><span></span><span></span>
    </div>
  </div>

  <div
    v-else
    class="msg"
    :class="[`msg-${msg.role}`, { 'bubble-in': animate }]"
    data-testid="coach-message"
    :data-role="msg.role"
  >
    <div class="bubble">
      {{ msg.text }}
      <button
        v-if="msg.role === 'error' && msg.retry"
        type="button"
        class="btn btn-sm btn-outline-danger mt-2 d-block"
        @click="emit('retry')"
      >
        Try again
      </button>
    </div>

    <!-- Habit suggestions attached to a coach reply -->
    <div v-if="msg.suggestions?.length" class="suggestions">
      <CoachSuggestion
        v-for="(habit, idx) in msg.suggestions"
        :key="idx"
        :habit="habit"
        :added="chat.isAdded(msg, idx)"
        :adding="chat.addingKey === chat.keyFor(msg, idx)"
        @add="emit('add', idx)"
      />
      <button
        v-if="chat.unaddedCount(msg) > 1"
        type="button"
        class="btn btn-sm btn-outline-primary align-self-start"
        :disabled="chat.addingKey !== null"
        data-testid="coach-add-all"
        @click="emit('add-all')"
      >
        <i class="bi bi-plus-circle me-1" aria-hidden="true"></i>Add all {{ chat.unaddedCount(msg) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import CoachSuggestion from './CoachSuggestion.vue'
import { useCoachChatStore } from '../../stores/coachChat'

defineProps({
  msg: { type: Object, default: null },
  typing: { type: Boolean, default: false },
  animate: { type: Boolean, default: false },
})

const emit = defineEmits(['retry', 'add', 'add-all'])

// The store knows which suggestions are already added or being added
const chat = useCoachChatStore()
</script>

<style scoped>
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

/* A new bubble fades and slides up into place */
.bubble-in {
  animation: bubble-in 220ms var(--ease-out) backwards;
}
@keyframes bubble-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes bubble-fade {
  from { opacity: 0; }
  to { opacity: 1; }
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

.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin-top: var(--s-2);
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .bubble-in {
    animation-name: bubble-fade;
  }
}
</style>
