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

      // Provide user-friendly error messages
      if (response.status === 500) {
        throw new Error(errorData.error || 'Server-feil. Prøv igjen om litt.')
      } else if (response.status === 429) {
        throw new Error('For mange forespørsler. Vent litt før du prøver igjen.')
      } else if (response.status === 503) {
        throw new Error('Tjenesten er utilgjengelig. Prøv igjen senere.')
      }

      throw new Error(errorData.error || `Nettverksfeil (${response.status}). Prøv igjen.`)
    }

    return await response.json()
  } catch (error) {
    console.error('AI Plan Generation Error:', error)

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Ingen nettverkstilkobling. Sjekk internett-tilkoblingen din.')
    }

    throw new Error(error.message || 'Kunne ikke generere treningsplan. Prøv igjen.')
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

      // Provide user-friendly error messages
      if (response.status === 500) {
        throw new Error(errorData.error || 'Server-feil. Prøv igjen om litt.')
      } else if (response.status === 429) {
        throw new Error('For mange forespørsler. Vent litt før du prøver igjen.')
      }

      throw new Error(errorData.error || `Nettverksfeil (${response.status}). Prøv igjen.`)
    }

    return await response.json()
  } catch (error) {
    console.error('AI Adjustment Error:', error)

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Ingen nettverkstilkobling. Sjekk internett-tilkoblingen din.')
    }

    throw new Error(error.message || 'Kunne ikke generere justeringsforslag. Prøv igjen.')
  }
}

export default {
  generateTrainingPlan,
  getAdjustmentSuggestions
}
