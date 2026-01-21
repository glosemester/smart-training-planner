/**
 * Chat Service for AI Training Coach
 * Uses OpenAI GPT-4o mini via Netlify function
 */

/**
 * Send a message to the AI training coach
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} userContext - Optional context about user's training
 * @returns {Promise<Object>} AI response with message and usage stats
 */
export async function sendChatMessage(messages, userContext = null) {
  try {
    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required')
    }

    // Call Netlify function
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        userContext
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Chat service error:', error)
    throw error
  }
}

/**
 * Build user context from workout data and current plan
 * @param {Object} params - Context parameters
 * @returns {Object} Formatted user context
 */
export function buildUserContext({ workouts = [], currentPlan = null, stats = null, goals = null }) {
  const context = {}

  // Add recent workouts (last 10)
  if (workouts && workouts.length > 0) {
    context.recentWorkouts = workouts.slice(0, 10).map(w => ({
      date: w.date,
      type: w.type,
      title: w.title,
      duration: w.duration,
      running: w.running,
      rpe: w.rpe,
      notes: w.notes
    }))
  }

  // Add current plan with full session details for modifications
  if (currentPlan) {
    context.currentPlan = {
      id: currentPlan.id,
      focus: currentPlan.focus,
      weekNumber: currentPlan.weekNumber,
      totalLoad: currentPlan.totalLoad,
      sessions: currentPlan.sessions?.map(s => ({
        id: s.id,
        day: s.day,
        type: s.type,
        title: s.title,
        description: s.description,
        duration_minutes: s.duration_minutes,
        details: s.details
      }))
    }
  }

  // Add stats
  if (stats) {
    context.stats = stats
  }

  // Add goals
  if (goals) {
    context.goals = goals
  }

  return Object.keys(context).length > 0 ? context : null
}

/**
 * Suggested starter prompts for users
 */
export const STARTER_PROMPTS = [
  {
    id: 'analyze-training',
    text: 'Analyser min treningshistorikk',
    icon: '📊'
  },
  {
    id: 'improve-pace',
    text: 'Hvordan kan jeg bli raskere?',
    icon: '⚡'
  },
  {
    id: 'prevent-injury',
    text: 'Tips til skadeforebygging',
    icon: '🛡️'
  },
  {
    id: 'race-prep',
    text: 'Forberedelse til konkurranse',
    icon: '🏃'
  },
  {
    id: 'motivation',
    text: 'Trenger motivasjon!',
    icon: '💪'
  },
  {
    id: 'recovery',
    text: 'Hvordan restituere bedre?',
    icon: '😴'
  }
]
