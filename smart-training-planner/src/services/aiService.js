import { anthropicConfig, TRAINING_SYSTEM_PROMPT } from '../config/anthropic'

/**
 * Generer treningsplan via Anthropic Claude API
 * 
 * MERK: I en produksjonsapp bør dette gjøres via en backend-funksjon
 * (f.eks. Firebase Cloud Functions eller Netlify Functions)
 * for å beskytte API-nøkkelen.
 */
export async function generateTrainingPlan(userData) {
  const { apiKey, model, maxTokens } = anthropicConfig

  if (!apiKey) {
    throw new Error('Anthropic API-nøkkel mangler. Sjekk .env-filen.')
  }

  // Bygg user prompt basert på brukerdata
  const userPrompt = buildUserPrompt(userData)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: TRAINING_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API-feil: ${response.status}`)
    }

    const data = await response.json()
    
    // Parse JSON fra responsen
    const content = data.content[0].text
    
    // Finn JSON i responsen (kan være wrappet i markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Kunne ikke parse treningsplan fra AI-respons')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('AI Plan Generation Error:', error)
    throw error
  }
}

/**
 * Bygg user prompt med all relevant data
 */
function buildUserPrompt(userData) {
  const {
    goals = {},
    availableDays = [],
    maxSessionDuration = 90,
    recentWorkouts = [],
    health = {},
    notes = ''
  } = userData

  // Formater siste økter
  const workoutSummary = recentWorkouts.slice(0, 20).map(w => ({
    date: w.date,
    type: w.type,
    duration: w.duration,
    distance: w.running?.distance,
    rpe: w.rpe
  }))

  return `
Lag en treningsplan for kommende uke basert på følgende informasjon:

**HOVEDMÅL:**
${goals.primary || 'Ikke satt'}

**DELMÅL:**
${goals.secondary?.length > 0 ? goals.secondary.map(g => `- ${g}`).join('\n') : 'Ingen delmål satt'}

**UKENTLIGE MÅL:**
- Løping: ${goals.weeklyTargets?.runningKm || 0} km
- Styrkeøkter: ${goals.weeklyTargets?.strengthSessions || 0}

**TILGJENGELIGE TRENINGSDAGER:**
${availableDays.length > 0 ? availableDays.join(', ') : 'Alle dager'}

**MAKS TID PER ØKT:**
${maxSessionDuration} minutter

**SISTE UKERS TRENING (opptil 20 økter):**
${workoutSummary.length > 0 ? JSON.stringify(workoutSummary, null, 2) : 'Ingen tidligere økter registrert'}

**HELSEDATA SISTE UKE:**
- Gjennomsnittlig søvn: ${health.avgSleep || 'Ikke registrert'} timer
- Hvilepuls: ${health.restingHR || 'Ikke registrert'} bpm
- HRV: ${health.hrv || 'Ikke registrert'}
- Generell form: ${health.generalFeeling || 'Ikke registrert'}

**NOTATER/PREFERANSER:**
${notes || 'Ingen spesielle notater'}

Lag en balansert treningsuke som bygger mot målene. Husk 80/20-prinsippet for løping og god balanse mellom belastning og restitusjon.
`
}

/**
 * Få AI-forslag til justeringer basert på avvik
 */
export async function getAdjustmentSuggestions(originalPlan, actualWorkouts) {
  const { apiKey, model, maxTokens } = anthropicConfig

  if (!apiKey) {
    throw new Error('Anthropic API-nøkkel mangler')
  }

  const prompt = `
Basert på den opprinnelige treningsplanen og hva som faktisk ble gjennomført, 
gi konkrete forslag til hvordan resten av uken bør justeres.

**OPPRINNELIG PLAN:**
${JSON.stringify(originalPlan, null, 2)}

**FAKTISK GJENNOMFØRT:**
${JSON.stringify(actualWorkouts, null, 2)}

Gi 2-3 konkrete justeringsforslag i JSON-format:
{
  "analysis": "kort analyse av avviket",
  "suggestions": [
    {
      "day": "dag som bør justeres",
      "originalSession": "opprinnelig økt",
      "suggestedChange": "foreslått endring",
      "reason": "begrunnelse"
    }
  ]
}
`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`API-feil: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content[0].text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch (error) {
    console.error('AI Adjustment Error:', error)
    throw error
  }
}

export default {
  generateTrainingPlan,
  getAdjustmentSuggestions
}
