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

// Default model to use - Gemini 2.5 Flash is fast, cost-effective and supports structured JSON
const GEMINI_MODEL = 'gemini-2.5-flash'

/**
 * Controller: POST /api/ai/suggest-habits
 * Body: { prompt?: string, questionnaire?: object, apiKey?: string }
 */
export async function suggestHabits(req, res) {
  const { prompt, questionnaire, apiKey: clientApiKey } = req.body || {}

  // 1. Resolve API key: Check client-supplied key first, then fall back to server environment
  const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return res.status(400).json({
      message:
        'Missing Gemini API Key. Please provide an API key in the coach settings or set GEMINI_API_KEY in server/.env',
    })
  }

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

STRICT DATABASE FORMAT RULES:
Every suggested habit MUST adhere to the HabitBuddy schema:
- name: String (concise, actionable, max 40 chars, e.g. "Morning Brisk Walk", "Drink 8 Glasses of Water")
- category: One of ${JSON.stringify(HABIT_CATEGORIES)}
- frequency: One of ${JSON.stringify(HABIT_FREQUENCIES)}
- target: An object with { amount: Number (positive, e.g. 8, 30, 2), unit: String (e.g. "glasses", "minutes", "km", "pages", "hours") }
- icon: A single relevant emoji (e.g. "🏃", "💧", "😴", "📚", "🧘")
- description: A short, encouraging 1-sentence explanation of why this habit helps their specific goal.
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
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: {
              type: 'string',
              enum: HABIT_CATEGORIES,
            },
            frequency: {
              type: 'string',
              enum: HABIT_FREQUENCIES,
            },
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
        },
      },
    },
  }

  // 4. Asynchronously call Google Gemini API using native fetch (standard HTTP POST)
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error response:', errorData)
      const errorMsg = errorData?.error?.message || `Gemini API returned status ${response.status}`
      return res.status(502).json({ message: `Gemini API Error: ${errorMsg}` })
    }

    const data = await response.json()
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      return res.status(502).json({ message: 'No recommendations returned from Gemini API.' })
    }

    const suggestions = JSON.parse(textOutput)

    // Sanitize and validate suggestions against the schema
    const validated = suggestions.map((s) => ({
      name: String(s.name || '').slice(0, 50).trim(),
      category: HABIT_CATEGORIES.includes(s.category) ? s.category : 'other',
      frequency: HABIT_FREQUENCIES.includes(s.frequency) ? s.frequency : 'daily',
      target: {
        amount: Number(s.target?.amount) > 0 ? Number(s.target.amount) : 1,
        unit: String(s.target?.unit || 'times').slice(0, 20).trim(),
      },
      icon: String(s.icon || '✅').trim(),
      description: String(s.description || '').trim(),
    }))

    res.json({ suggestions: validated })
  } catch (err) {
    console.error('Gemini AI controller error:', err)
    res.status(500).json({ message: `Failed to generate habits: ${err.message}` })
  }
}

