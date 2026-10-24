// =============================================================================
// [IS216 Project Addition: Gemini AI Goal Coach Controller]
// Technology: Node.js (v22 built-in fetch) + Google Gemini API (v1beta REST)
//
// Description:
// Receives user lifestyle descriptions or structured questionnaire answers,
// sends an asynchronous HTTP POST request to the Google Gemini API, and enforces
// structured JSON output matching the HabitBuddy database schema (server/models/Habit.js).
// =============================================================================

import Habit, { HABIT_CATEGORIES, HABIT_FREQUENCIES } from '../models/Habit.js'
import { cleanEnvVar } from '../config/neon.js'

// Default model to use - Gemini 3.5 Flash is fast and supports structured JSON output.
// (gemini-2.5-flash is no longer available to new API keys.)
const GEMINI_MODEL = 'gemini-3.5-flash'
// Give up on a slow Gemini call rather than leaving the user waiting forever
const GEMINI_TIMEOUT_MS = 45_000

const MISSING_KEY_MESSAGE =
  'Missing Gemini API Key. Please provide an API key in the coach settings or set GEMINI_API_KEY in server/.env'

// Schema rules shared by both endpoints so suggestions always fit the habits table
const HABIT_RULES = `
STRICT DATABASE FORMAT RULES:
Every suggested habit MUST adhere to the HabitBuddy schema:
- name: String (concise, actionable, max 40 chars, e.g. "Morning Brisk Walk", "Drink 8 Glasses of Water")
- category: One of ${JSON.stringify(HABIT_CATEGORIES)}
- frequency: One of ${JSON.stringify(HABIT_FREQUENCIES)}
- target: An object with { amount: Number (positive, e.g. 8, 30, 2), unit: String (e.g. "glasses", "minutes", "km", "pages", "hours") }
- icon: A single relevant emoji (e.g. "🏃", "💧", "😴", "📚", "🧘")
- description: A short, encouraging 1-sentence explanation of why this habit helps their specific goal.
`.trim()

const HABIT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    category: { type: 'string', enum: HABIT_CATEGORIES },
    frequency: { type: 'string', enum: HABIT_FREQUENCIES },
    target: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        unit: { type: 'string' },
      },
      required: ['amount', 'unit'],
    },
    icon: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['name', 'category', 'frequency', 'target', 'icon', 'description'],
}

function resolveApiKey(clientApiKey) {
  return cleanEnvVar(clientApiKey || process.env.GEMINI_API_KEY, 'GEMINI_API_KEY')
}

// Clamp one Gemini suggestion to valid habit fields
function sanitizeSuggestion(s) {
  return {
    name: String(s?.name || '').slice(0, 50).trim(),
    category: HABIT_CATEGORIES.includes(s?.category) ? s.category : 'other',
    frequency: HABIT_FREQUENCIES.includes(s?.frequency) ? s.frequency : 'daily',
    target: {
      amount: Number(s?.target?.amount) > 0 ? Number(s.target.amount) : 1,
      unit: String(s?.target?.unit || 'times').slice(0, 20).trim(),
    },
    icon: String(s?.icon || '✅').trim(),
    description: String(s?.description || '').trim(),
  }
}

// POST a generateContent payload to Gemini and parse its JSON text output.
// Resolves to { data } on success or { error } with a user-facing message.
async function callGemini(payload, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    })
  } catch (err) {
    if (err.name === 'TimeoutError') return { error: 'The AI coach took too long to respond. Please try again.' }
    throw err
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Gemini API error response:', errorData)
    const errorMsg = errorData?.error?.message || `Gemini API returned status ${response.status}`
    return { error: `Gemini API Error: ${errorMsg}` }
  }

  const data = await response.json()
  // Thinking models can return several parts; keep only the answer text
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  const textOutput = parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
  if (!textOutput) return { error: 'No recommendations returned from Gemini API.' }

  return { data: JSON.parse(textOutput) }
}

/**
 * Controller: POST /api/ai/suggest-habits
 * Body: { prompt?: string, questionnaire?: object, apiKey?: string }
 */
export async function suggestHabits(req, res) {
  const { prompt, questionnaire, apiKey: clientApiKey } = req.body || {}

  // 1. Resolve API key: Check client-supplied key first, then fall back to server environment
  const apiKey = resolveApiKey(clientApiKey)
  if (!apiKey) return res.status(400).json({ message: MISSING_KEY_MESSAGE })

  // 2. Build the context for Gemini
  let userContext = ''
  if (prompt && prompt.trim()) {
    userContext += `User Lifestyle & Goal Description:\n"${prompt.trim()}"\n\n`
  }
  if (questionnaire && typeof questionnaire === 'object') {
    userContext += `User Questionnaire Responses:\n${JSON.stringify(questionnaire, null, 2)}\n\n`
  }

  if (!userContext.trim()) {
    return res.status(400).json({
      message: 'Please provide either a goal description or complete the questionnaire.',
    })
  }

  // 3. Define the system instructions and output schema
  const systemInstruction = `
You are the expert fitness and wellness coach for "HabitBuddy", a student health and habit-tracking web app.
Your task is to analyze the user's lifestyle and goals, and generate 3 to 5 realistic, high-impact, achievable habits.

${HABIT_RULES}
`.trim()

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${systemInstruction}\n\n${userContext}\nGenerate 3 to 5 tailored habits for this user. Output ONLY a valid JSON array of habit objects.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: HABIT_SCHEMA,
      },
    },
  }

  // 4. Asynchronously call Google Gemini API using native fetch (standard HTTP POST)
  try {
    const result = await callGemini(payload, apiKey)
    if (result.error) return res.status(502).json({ message: result.error })

    const validated = (Array.isArray(result.data) ? result.data : []).map(sanitizeSuggestion)

    res.json({ suggestions: validated })
  } catch (err) {
    console.error('Gemini AI controller error:', err)
    res.status(500).json({ message: `Failed to generate habits: ${err.message}` })
  }
}

const MAX_CHAT_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 1000

/**
 * Controller: POST /api/ai/coach-chat
 * Multi-turn goal coach. The client sends the whole conversation each time.
 * Body: { messages: [{ role: 'user' | 'model', text: string }], apiKey?: string }
 * Returns: { reply: string, suggestions: Habit[] }
 */
export async function coachChat(req, res) {
  const { messages, apiKey: clientApiKey } = req.body || {}

  // 1. Validate the conversation: non-empty, well-formed, and ending with the user's turn
  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) => (m?.role === 'user' || m?.role === 'model') && typeof m.text === 'string' && m.text.trim(),
    )
  if (!valid) {
    return res.status(400).json({ message: 'Please send at least one message to the coach.' })
  }
  if (messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ message: 'The last message must come from the user.' })
  }

  const apiKey = resolveApiKey(clientApiKey)
  if (!apiKey) return res.status(400).json({ message: MISSING_KEY_MESSAGE })

  // 2. Keep the request small: only the recent turns, each capped in length.
  // Gemini requires the conversation to start with a user turn.
  let recent = messages.slice(-MAX_CHAT_MESSAGES)
  while (recent.length && recent[0].role !== 'user') recent = recent.slice(1)

  const systemInstruction = `
You are the friendly goal coach inside "HabitBuddy", a student health and habit-tracking web app.
The user chats with you about their goals. Reply like a supportive coach: warm, concise (at most 3 short sentences), and practical.

How to respond:
- If the user's goal is vague, ask ONE short clarifying question (e.g. about their schedule or current level) and return no suggestions.
- Once you understand the goal, suggest 1 to 5 realistic, achievable habits that build towards it, and briefly say why in "reply".
- If the user asks to change earlier suggestions, return the updated habits.
- Off-topic requests: gently steer back to health, fitness, study or wellbeing habits.
- Never give medical diagnoses; suggest seeing a professional for health concerns.

${HABIT_RULES}
`.trim()

  const payload = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: recent.map((m) => ({
      role: m.role,
      parts: [{ text: m.text.trim().slice(0, MAX_MESSAGE_LENGTH) }],
    })),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          suggestions: { type: 'array', items: HABIT_SCHEMA },
        },
        required: ['reply', 'suggestions'],
      },
    },
  }

  // 3. Call Gemini and clean up its answer
  try {
    const result = await callGemini(payload, apiKey)
    if (result.error) return res.status(502).json({ message: result.error })

    const reply = String(result.data?.reply || '').trim()
    const suggestions = (Array.isArray(result.data?.suggestions) ? result.data.suggestions : [])
      .slice(0, 5)
      .map(sanitizeSuggestion)
      .filter((s) => s.name)

    res.json({ reply: reply || "Here's what I'd suggest.", suggestions })
  } catch (err) {
    console.error('Gemini coach chat error:', err)
    res.status(500).json({ message: `The coach couldn't reply: ${err.message}` })
  }
}
