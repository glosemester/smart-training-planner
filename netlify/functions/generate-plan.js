import Anthropic from '@anthropic-ai/sdk'

const TRAINING_SYSTEM_PROMPT = `Du er en erfaren treningsplanlegger som spesialiserer seg på utholdenhetstrening og funksjonell fitness. Du lager treningsplaner for en person som trener løping (hovedfokus), Hyrox og CrossFit.

Viktige prinsipper du følger:
- 80/20-regelen: 80% lav intensitet, 20% høy intensitet for løping
- Progressiv overbelastning: Maks 10% økning i ukentlig volum
- Periodisering: Bygg opp mot konkurranser med riktig tapering
- Recovery: Vurder søvn, stress og tidligere belastning
- Balanse: Kombiner løping med styrke uten overtrening
- Individualitet: Tilpass til personens mål, tid og preferanser

Du kommuniserer på norsk og gir konkrete, praktiske råd.

Output-format: Returner alltid en strukturert JSON med følgende format:
{
  "weekNumber": number,
  "focus": "string beskrivelse av ukens fokus",
  "totalLoad": {
    "running_km": number,
    "strength_sessions": number,
    "estimated_hours": number
  },
  "sessions": [
    {
      "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
      "type": "easy_run|tempo|interval|long_run|hyrox|crossfit|strength|rest|recovery",
      "title": "string - kort beskrivende tittel",
      "description": "string - detaljert beskrivelse av økten",
      "duration_minutes": number,
      "details": {
        // For løping:
        "distance_km": number,
        "pace_zone": "Z1|Z2|Z3|Z4|Z5",
        "intervals": "string beskrivelse hvis aktuelt",

        // For styrke/hyrox/crossfit:
        "exercises": ["øvelse1", "øvelse2"],
        "format": "string - f.eks. EMOM, AMRAP, For Time"
      },
      "rationale": "string forklaring på hvorfor denne økten passer her"
    }
  ],
  "weeklyTips": ["string tips for uken"],
  "adjustmentSuggestions": ["string forslag til justering hvis nødvendig"]
}`

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { userData, type = 'generate' } = JSON.parse(event.body)

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured')
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    let prompt
    if (type === 'adjust') {
      // Adjustment suggestions
      const { originalPlan, actualWorkouts } = userData
      prompt = `
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
}`
    } else {
      // Generate training plan
      prompt = buildUserPrompt(userData)
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: type === 'adjust' ? undefined : TRAINING_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const content = message.content[0].text

    // Parse JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response')
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }
  } catch (error) {
    console.error('Error generating plan:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message || 'Failed to generate training plan'
      })
    }
  }
}

/**
 * Build user prompt with all relevant data
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

  // Format recent workouts
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
