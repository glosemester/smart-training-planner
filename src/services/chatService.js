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
        content: msg.content
      })),
      userContext
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
export function buildUserContext({ workouts = [], currentPlan = null, plans = [], stats = null, goals = null }) {
  const context = {}

  // Add all workouts (for exercise history queries)
  if (workouts && workouts.length > 0) {
    context.allWorkouts = workouts.map(w => ({
      id: w.id,
      date: w.date,
      type: w.type,
      title: w.title,
      duration: w.duration,
      running: w.running,
      strength: w.strength, // Include exercises with weights
      rpe: w.rpe,
      notes: w.notes
    }))

    // Also provide recent summary (last 10)
    context.recentWorkouts = workouts.slice(0, 10).map(w => ({
      date: w.date,
      type: w.type,
      title: w.title,
      duration: w.duration
    }))

    // Build exercise history for easy querying
    context.exerciseHistory = buildExerciseHistory(workouts)
  }

  // Add current plan with full session details for modifications
  if (currentPlan) {
    context.currentPlan = {
      id: currentPlan.id,
      focus: currentPlan.focus,
      weekNumber: currentPlan.weekNumber,
      weekStart: currentPlan.weekStart,
      totalLoad: currentPlan.totalLoad,
      sessions: currentPlan.sessions?.map(s => ({
        id: s.id,
        day: s.day,
        type: s.type,
        title: s.title,
        description: s.description,
        duration_minutes: s.duration_minutes,
        details: s.details,
        status: s.status
      }))
    }
  }

  // Add all plans for comprehensive view
  if (plans && plans.length > 0) {
    context.allPlans = plans.map(p => ({
      id: p.id,
      focus: p.focus,
      weekNumber: p.weekNumber,
      weekStart: p.weekStart,
      phase: p.phase,
      totalLoad: p.totalLoad,
      sessions: p.sessions?.map(s => ({
        id: s.id,
        day: s.day,
        type: s.type,
        title: s.title,
        status: s.status, // 'planned' or 'completed'
        duration_minutes: s.duration_minutes,
        details: s.details
      }))
    }))

    // Generate comprehensive adherence analysis
    const adherenceAnalysis = generateAdherenceSummary(plans, workouts)
    context.planoppfølging = adherenceAnalysis

    // Also add simplified version for backward compatibility
    context.planAdherence = adherenceAnalysis.overall
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
