/**
 * Chat Service for AI Training Coach
 * Uses OpenAI GPT-4o mini via Netlify function
 */

import { generateAdherenceSummary } from '../utils/planAdherence'
import { functions } from '../config/firebase'
import { httpsCallable } from 'firebase/functions'

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

    // Call Firebase function
    const chatFn = httpsCallable(functions, 'chat')
    const result = await chatFn({

      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        image: msg.image // Include image data if present
      })),
      userContext: {
        ...userContext,
        mentalState: userContext?.mentalState || null
      }
    })

    return result.data
  } catch (error) {
    console.error('Chat service error:', error)
    throw error
  }
}

/**
 * Build exercise history from workouts for easy querying
 * @param {Array} workouts - All workouts
 * @returns {Object} Exercise history mapped by exercise name
 */
function buildExerciseHistory(workouts) {
  const exerciseMap = {}

  workouts.forEach(workout => {
    if (workout.strength?.exercises) {
      workout.strength.exercises.forEach(exercise => {
        if (!exercise.name?.trim()) return

        const exerciseName = exercise.name.toLowerCase().trim()
        if (!exerciseMap[exerciseName]) {
          exerciseMap[exerciseName] = []
        }

        exerciseMap[exerciseName].push({
          date: workout.date,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          workoutType: workout.type,
          workoutTitle: workout.title
        })
      })
    }
  })

  // Sort each exercise's history by date (most recent first)
  Object.keys(exerciseMap).forEach(exerciseName => {
    exerciseMap[exerciseName].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    )
  })

  return exerciseMap
}

/**
 * Build user context from workout data and plans
 * @param {Object} params - Context parameters
 * @returns {Object} Formatted user context
 */
export function buildUserContext({ workouts = [], currentPlan = null, plans = [], stats = null, goals = null, mentalState = null }) {
  const context = {}

  // 1. OPTIMALISERT TRENINGSHISTORIKK
  // Vi sender kun de siste 50 øktene for å spare tokens, men beholder total statistikk hvis mulig
  if (workouts && workouts.length > 0) {
    // Sortert nyeste først
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date))

    context.recentWorkouts = sortedWorkouts.slice(0, 50).map(w => ({
      id: w.id,
      date: w.date,
      type: w.type,
      title: w.title,
      duration: w.duration,
      rpe: w.rpe,
      // Forenkle styrkedata: Send kun antall øvelser, ikke hver repetisjon
      strengthSummary: w.strength?.exercises ? `${w.strength.exercises.length} øvelser` : null,
      notes: w.notes ? w.notes.substring(0, 100) : null // Kutt lange notater
    }))

    // Bygg en lettere versjon av exercise history (kun nyeste perser eller siste løft)
    // context.exerciseHistory = buildSimplifiedExerciseHistory(sortedWorkouts) 
    // ^ Deaktivert midlertidig for å spare enda mer plass, AI-en bruker den sjelden
  }

  // 2. NÅVÆRENDE PLAN MED FORENKLET STRUKTUR
  if (currentPlan) {
    context.currentPlan = {
      id: currentPlan.id,
      focus: currentPlan.focus,
      weekNumber: currentPlan.weekNumber,
      weekStart: currentPlan.weekStart,
      sessions: currentPlan.sessions?.map(s => ({
        id: s.id,
        day: s.day,
        type: s.type,
        title: s.title,
        duration: s.duration_minutes,
        description: s.description,
        status: s.status
      }))
    }
  }

  // 3. ALLE FREMTIDIGE PLANER (Full visibility til konkurranse)
  // AI må se hele planen for å kunne gjøre langsiktige justeringer
  if (plans && plans.length > 0) {
    const today = new Date()
    context.upcomingPlans = plans
      .filter(p => new Date(p.weekStart) >= today)
      .map(p => ({
        weekNumber: p.weekNumber,
        weekStart: p.weekStart,
        phase: p.phase,
        focus: p.focus
      }))

    // Legg også til totalt antall uker til konkurranse for kontekst
    if (context.upcomingPlans.length > 0) {
      context.weeksToRace = context.upcomingPlans.length
    }
  }

  // 4. STATISTIKK OG MÅL (Viktigst!)
  if (stats) context.stats = stats
  if (goals) context.goals = goals

  // 5. MENTAL MODEL (AI Thoughts)
  if (mentalState) context.mentalState = mentalState

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
