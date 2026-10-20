// =============================================================================
// [IS216 Project Addition: Gemini AI Service]
// Frontend service calling the Express /api/ai endpoints via Axios
// =============================================================================

import api from './api'

export const aiService = {
  /**
   * Request tailored habit recommendations from Gemini via Express backend
   * @param {Object} payload
   * @param {string} [payload.prompt] - Freeform description of lifestyle/goal
   * @param {Object} [payload.questionnaire] - Structured questionnaire answers
   * @param {string} [payload.apiKey] - Optional client-supplied Gemini API key
   * @returns {Promise<Array>} List of habit objects matching Habit schema
   */
  async suggestHabits({ prompt, questionnaire, apiKey }) {
    const { data } = await api.post('/ai/suggest-habits', {
      prompt,
      questionnaire,
      apiKey,
    })
    return data.suggestions || []
  },
}

