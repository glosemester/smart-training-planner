import { functions } from '../config/firebase'
import { httpsCallable } from 'firebase/functions'

/**
 * Generer treningsplan via Firebase Cloud Functions
 * 
 * Bruker httpsCallable som automatisk håndterer:
 * - Autentisering (sender user token)
 * - JSON serialisering/deserialisering
 * - Backend errors
 */

export async function generateTrainingPlan(userData) {
  try {
    const generatePlanFn = httpsCallable(functions, 'generatePlan')

    // Call function
    const result = await generatePlanFn({
      userData,
      type: 'generate'
    })

    return result.data
  } catch (error) {
    console.error('AI Plan Generation Error:', error)
    throw new Error(error.message || 'Kunne ikke generere treningsplan.')
  }
}

/**
 * Generate training plan in chunks (for multi-week plans)
 */
export async function generateTrainingPlanChunk({ userData, chunkInfo }) {
  try {
    const generatePlanFn = httpsCallable(functions, 'generatePlan')

    // Increase timeout on client side if needed is handled by Firebase config usually, 
    // but httpsCallable doesn't have explicit timeout param in JS SDK easily, 
    // strictly determined by backend runWith/setGlobalOptions.

    const result = await generatePlanFn({
      userData,
      type: 'generate',
      chunkInfo
    })

    return result.data
  } catch (error) {
    console.error('Chunk generation error:', error)
    throw new Error(error.message || 'Kunne ikke generere del av plan.')
  }
}

/**
 * Få AI-forslag til justeringer
 */
export async function getAdjustmentSuggestions(originalPlan, actualWorkouts) {
  try {
    const generatePlanFn = httpsCallable(functions, 'generatePlan')

    const result = await generatePlanFn({
      userData: { originalPlan, actualWorkouts },
      type: 'adjust'
    })

    return result.data
  } catch (error) {
    console.error('AI Adjustment Error:', error)
    throw new Error(error.message || 'Kunne ikke hente justeringsforslag.')
  }
}

// Updated exports
export default {
  generateTrainingPlan,
  generateTrainingPlanChunk,
  getAdjustmentSuggestions
}
