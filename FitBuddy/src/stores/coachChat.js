// AI coach chat store: holds the whole conversation with the goal coach.
// It lives in a store (not in the chat panel) so closing the panel, or leaving
// the Habits page, does not wipe the chat. It resets on a full page reload.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { aiService } from '../services/aiService'
import { habitService, errorMessage } from '../services/habitService'

const API_KEY_STORAGE = 'fitbuddy_gemini_api_key'

// The first message the coach shows (it is never sent to Gemini)
const GREETING = {
  id: 'greeting',
  role: 'model',
  text: "Hi! I'm your goal coach. Tell me what you'd like to achieve and I'll suggest habits to get you there.",
}

function readStoredKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export const useCoachChatStore = defineStore('coachChat', () => {
  const messages = ref([{ ...GREETING }])
  const addedKeys = ref([]) // "messageId-suggestionIndex" of habits already added
  const draft = ref('') // what the user has typed but not sent
  const pending = ref(false) // waiting for the coach's reply
  const addingKey = ref(null) // the suggestion being added right now
  const needsKey = ref(false) // the server has no Gemini key, so ask the user
  const apiKey = ref(readStoredKey())
  let nextId = 1

  // How many messages the user has sent (0 = show the starter chips)
  const userTurns = computed(() => messages.value.filter((m) => m.role === 'user').length)

  function saveApiKey() {
    try {
      if (apiKey.value.trim()) localStorage.setItem(API_KEY_STORAGE, apiKey.value.trim())
      else localStorage.removeItem(API_KEY_STORAGE)
    } catch {
      // storage blocked: the key still works for this session
    }
  }

  function resetChat() {
    messages.value = [{ ...GREETING }]
    addedKeys.value = []
    draft.value = ''
  }

  function addErrorMessage(text, retry) {
    messages.value.push({ id: nextId++, role: 'error', text, retry })
  }

  // ---- Talking to the coach ----

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

  // Adds the user's message. Returns false if there is nothing to send.
  function addUserMessage(text) {
    const message = String(text || '').trim()
    if (!message || pending.value) return false
    draft.value = ''
    messages.value.push({ id: nextId++, role: 'user', text: message })
    return true
  }

  // Sends the whole conversation to the server and adds the coach's reply
  async function requestReply() {
    pending.value = true
    try {
      const { reply, suggestions } = await aiService.coachChat(conversationForApi(), apiKey.value.trim() || undefined)
      needsKey.value = false
      messages.value.push({ id: nextId++, role: 'model', text: reply, suggestions })
    } catch (err) {
      const text = errorMessage(err)
      if (/api key/i.test(text)) needsKey.value = true
      addErrorMessage(needsKey.value ? 'Add a Gemini API key below, then try again.' : text, true)
    } finally {
      pending.value = false
    }
  }

  function removeMessage(msg) {
    messages.value = messages.value.filter((m) => m !== msg)
  }

  // ---- Adding suggested habits ----

  function keyFor(msg, idx) {
    return `${msg.id}-${idx}`
  }

  function isAdded(msg, idx) {
    return addedKeys.value.includes(keyFor(msg, idx))
  }

  function unaddedCount(msg) {
    return msg.suggestions.filter((_, idx) => !isAdded(msg, idx)).length
  }

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
    addedKeys.value.push(keyFor(msg, idx))
  }

  // Adds one suggested habit. Returns true if it was saved.
  async function addHabit(msg, idx) {
    try {
      await createHabit(msg, idx)
      return true
    } catch (err) {
      addErrorMessage(errorMessage(err))
      return false
    } finally {
      addingKey.value = null
    }
  }

  // Adds every suggestion of a message that is not added yet
  async function addAll(msg) {
    try {
      for (let idx = 0; idx < msg.suggestions.length; idx++) {
        if (!isAdded(msg, idx)) await createHabit(msg, idx)
      }
    } catch (err) {
      addErrorMessage(errorMessage(err))
    } finally {
      addingKey.value = null
    }
  }

  return {
    messages, draft, pending, addingKey, needsKey, apiKey, addedKeys, userTurns,
    saveApiKey, resetChat, addUserMessage, requestReply, removeMessage,
    keyFor, isAdded, unaddedCount, addHabit, addAll,
  }
})
