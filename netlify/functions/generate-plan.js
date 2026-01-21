import Anthropic from '@anthropic-ai/sdk'

// Netlify Function configuration
export const config = {
  timeout: 60 // 60 seconds for AI generation
}

const TRAINING_SYSTEM_PROMPT = `Du er en erfaren treningsplanlegger som spesialiserer seg på utholdenhetstrening og funksjonell fitness. Du lager treningsplaner for en person som trener løping (hovedfokus), Hyrox og CrossFit.

Viktige prinsipper du følger:
- 80/20-regelen: 80% lav intensitet, 20% høy intensitet for løping
- Progressiv overbelastning: Maks 10% økning i ukentlig volum
- Periodisering: Bygg opp mot konkurranser med riktig tapering
- Recovery: Vurder søvn, stress og tidligere belastning
- Balanse: Kombiner løping med styrke uten overtrening
- Individualitet: Tilpass til personens mål, tid og preferanser

**ULTRAMARATHON-SPESIFIKT (50+ km):**
For ultramarathon-distanser følger du disse ekstra prinsippene:
- Back-to-back long runs: Lange økter på fredag/lørdag eller lørdag/søndag for å trene tretthet
- Høyere ukentlig volum: Bygg opp til 80-120+ km per uke for 50-100 km løp
- Lengre long runs: Opp til 3-5 timer for de lengste øktene
- Fokus på utholdenhet fremfor hastighet: Mer Z1-Z2, mindre høyintensitet
- Terrengtrening: Prioriter trail/terrengløp hvis mulig
- Ernæring og væske: Øv på fueling under lange økter
- Lengre taper: 2-3 uker taper for ultramarathon
- Mental trening: Inkluder tidvis kjedelige/monotone lange økter for mental styrke

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
  // CORS headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Validate request body
    if (!event.body) {
      throw new Error('Request body is required')
    }

    const { userData, type = 'generate' } = JSON.parse(event.body)

    if (!userData) {
      throw new Error('userData is required in request body')
    }

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

    // Call Anthropic API with error handling
    let message
    try {
      message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: type === 'adjust' ? undefined : TRAINING_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    } catch (apiError) {
      console.error('Anthropic API error:', apiError)
      throw new Error(`AI API error: ${apiError.message || 'Unknown error'}`)
    }

    const content = message.content[0]?.text
    if (!content) {
      throw new Error('AI response is empty')
    }

    // Parse JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', content.substring(0, 200))
      throw new Error('Could not parse JSON from AI response')
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', jsonMatch[0].substring(0, 200))
      throw new Error('Invalid JSON in AI response')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } catch (error) {
    // Enhanced error logging
    console.error('Error generating plan:', {
      message: error.message,
      stack: error.stack,
      type: type,
      hasUserData: !!userData
    })

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to generate training plan',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

/**
 * Build user prompt with all relevant data
 */
function buildUserPrompt(userData) {
  const {
    planType = 'full_plan',
    goal = {},
    availableDays = [],
    daysPerWeek = 4,
    maxSessionDuration = 60,
    preferences = '',
    recentWorkouts = [],
    health = {}
  } = userData

  // Format recent workouts
  const workoutSummary = recentWorkouts.slice(0, 20).map(w => ({
    date: w.date,
    type: w.type,
    duration: w.duration,
    distance: w.running?.distance,
    rpe: w.rpe
  }))

  // Beregn konkurransedato info
  let goalInfo = ''
  if (goal.type === 'race' && goal.date) {
    const raceDate = new Date(goal.date)
    const today = new Date()
    const weeksUntilRace = Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000))

    // Handle custom distance
    const distanceDisplay = goal.distance === 'custom' && goal.customDistance
      ? `${goal.customDistance} km (custom)`
      : goal.distance

    // Check if ultramarathon (50+ km)
    const isUltra = goal.distance === '50km' || goal.distance === '65km' || goal.distance === '100km' ||
                    (goal.distance === 'custom' && parseFloat(goal.customDistance) >= 50)

    goalInfo = `
**KONKURRANSEMÅL:**
- Distanse: ${distanceDisplay}${isUltra ? ' (ULTRAMARATHON)' : ''}
- Dato: ${goal.date}
- Uker til konkurranse: ${weeksUntilRace}
${goal.goalTime ? `- Målsetting: ${goal.goalTime}` : ''}

VIKTIG: Dette er uke ${weeksUntilRace > 12 ? 'base building' : weeksUntilRace > 4 ? 'build-up' : weeksUntilRace > 1 ? 'peak' : 'taper'} fase.
${isUltra ? 'Dette er en ULTRAMARATHON - følg ultramarathon-spesifikke prinsipper!' : ''}`
  } else {
    goalInfo = `**MÅL:** ${goal.type === 'general_fitness' ? 'Generell form' : goal.type === 'distance' ? 'Løpe lengre distanser' : goal.type === 'speed' ? 'Bli raskere' : 'Ikke spesifisert'}`
  }

  // Plantype-spesifikk instruksjon
  const planTypeInstructions = planType === 'running_only'
    ? `
**VIKTIG - KUN LØPEPLAN:**
Brukeren trener Hyrox/CrossFit på senter med egne økter. Lag KUN plan for løping.
- IKKE inkluder styrke, Hyrox eller CrossFit i planen
- Fokuser på løpeutvikling: easy runs, tempo, intervals, long runs
- Balansér intensitet og hvile for optimal løpeutvikling
`
    : `
**FULL PLAN:**
Lag en komplett treningsplan som inkluderer både løping OG styrke/Hyrox/CrossFit.
- Balanser løping (hovedfokus) med styrke
- 80/20-regelen for løping
- Unngå overtrening ved å spre hard trening
`

  return `
Lag en treningsplan for kommende uke basert på følgende informasjon:

${goalInfo}

${planTypeInstructions}

**TILGJENGELIGHET:**
- Dager per uke: ${daysPerWeek}
- Foretrukne dager: ${availableDays.join(', ')}
- Maks tid per økt: ${maxSessionDuration} minutter

**SISTE UKERS TRENING (opptil 20 økter):**
${workoutSummary.length > 0 ? JSON.stringify(workoutSummary, null, 2) : 'Ingen tidligere økter registrert'}

**HELSEDATA SISTE UKE:**
- Gjennomsnittlig søvn: ${health.avgSleep || 'Ikke registrert'} timer
- Hvilepuls: ${health.restingHR || 'Ikke registrert'} bpm
- HRV: ${health.hrv || 'Ikke registrert'}
- Generell form: ${health.generalFeeling || 'Ikke registrert'}

**PREFERANSER:**
${preferences || 'Ingen spesielle preferanser'}

Lag en balansert treningsuke som:
1. Respekterer brukerens tilgjengelighet og preferanser
2. Bygger mot målet (periodisering hvis konkurranse)
3. Følger 80/20-prinsippet for løping
4. Balanserer belastning og restitusjon
5. Tilpasser seg brukerens nåværende form basert på siste økter
`
}
