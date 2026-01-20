/**
 * Generer treningsplan via Netlify Function (secure backend)
 *
 * API-kallet gjøres nå via Netlify Functions for å beskytte API-nøkkelen.
 * Faller tilbake til lokal utvikling hvis Netlify Functions ikke er tilgjengelig.
 */
export async function generateTrainingPlan(userData) {
  try {
    // Try Netlify Function first (production)
    const response = await fetch('/.netlify/functions/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userData,
        type: 'generate'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API-feil: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('AI Plan Generation Error:', error)
    throw new Error(error.message || 'Kunne ikke generere treningsplan')
  }
}

/**
 * Få AI-forslag til justeringer basert på avvik
 */
export async function getAdjustmentSuggestions(originalPlan, actualWorkouts) {
  try {
    const response = await fetch('/.netlify/functions/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userData: { originalPlan, actualWorkouts },
        type: 'adjust'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API-feil: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('AI Adjustment Error:', error)
    throw new Error(error.message || 'Kunne ikke generere justeringsforslag')
  }
}

export default {
  generateTrainingPlan,
  getAdjustmentSuggestions
}
