import OpenAI from 'openai'

// Netlify Function configuration
export const config = {
  timeout: 20 // 20 seconds for AI generation
}

const SUMMARY_SYSTEM_PROMPT = `Du er en personlig treningscoach som gir korte, motiverende og presise daglige oppsummeringer.

Din oppgave er å:
1. Analysere siste treningsøkter, ernæring og planlagte aktiviteter
2. Gi en kort, motiverende oppsummering (2-4 korte innsikter)
3. Gi én konkret anbefaling for dagen
4. Vurder balanse mellom trening, mat og hvile

Output-format: Returner alltid strukturert JSON:
{
  "mood": "positive|neutral|warning",
  "headline": "string - kort, engasjerende overskrift (maks 50 tegn)",
  "insights": [
    "string - kort innsikt (maks 60 tegn)",
    "string - kort innsikt (maks 60 tegn)",
    "string - kort innsikt (maks 60 tegn)"
  ],
  "recommendation": "string - konkret anbefaling for dagen (80-120 tegn)",
  "energyBalance": "good|neutral|low",
  "readinessScore": number // 1-10
}

Regler:
- Vær kortfattet og direkte
- Bruk norsk, uformelt og motiverende språk
- Fokuser på actionable insights
- Unngå klisjeer og floskler
- mood "warning" kun ved tydelige problemsignaler (underfueling, overtrening)
- readinessScore baseres på søvn, treningsbelastning, ernæring`

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Only allow POST
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

    const { data } = JSON.parse(event.body)

    if (!data) {
      throw new Error('data is required in request body')
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Build user prompt from data
    const prompt = buildPrompt(data)

    // Call OpenAI API with GPT-4o mini (cost-effective)
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      throw new Error(`AI API error: ${apiError.message || 'Unknown error'}`)
    }

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI response is empty')
    }

    let result
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Invalid JSON in AI response')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } catch (error) {
    console.error('Error generating daily summary:', {
      message: error.message,
      stack: error.stack
    })

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to generate daily summary',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

/**
 * Build user prompt from data
 */
function buildPrompt(data) {
  const {
    lastWorkout,
    todaysNutrition,
    weekStats,
    todaysPlannedWorkout
  } = data

  // Format last workout
  let workoutSummary = 'Ingen nylige økter'
  if (lastWorkout) {
    const daysAgo = getDaysAgo(lastWorkout.date)
    workoutSummary = `${daysAgo}: ${lastWorkout.title || lastWorkout.type}, ${lastWorkout.duration} min`
    if (lastWorkout.running?.distance) {
      workoutSummary += `, ${lastWorkout.running.distance} km`
    }
    workoutSummary += `, RPE ${lastWorkout.rpe}/10`
  }

  // Format nutrition
  let nutritionSummary = 'Ingen matdata'
  if (todaysNutrition) {
    const { calories, protein, carbs, fat } = todaysNutrition.totals || {}
    nutritionSummary = `${calories || 0} kcal (P: ${protein || 0}g, K: ${carbs || 0}g, F: ${fat || 0}g)`
  }

  // Format week stats
  const weekSummary = weekStats
    ? `${weekStats.workouts} økter, ${weekStats.runningKm} km løpt, ${weekStats.hours}t trent`
    : 'Ingen ukesdata'

  // Format planned workout
  const plannedSummary = todaysPlannedWorkout
    ? `${todaysPlannedWorkout.title}, ${todaysPlannedWorkout.duration_minutes} min`
    : 'Ingen planlagt økt'

  return `
Analyser dagens trenings- og ernæringssituasjon og gi en motiverende oppsummering.

**SISTE ØKT:**
${workoutSummary}

**MAT I DAG:**
${nutritionSummary}

**DENNE UKEN:**
${weekSummary}

**I DAG PLANLAGT:**
${plannedSummary}

Gi en kort, motiverende oppsummering med 2-4 innsikter og én konkret anbefaling.
Vurder balanse mellom trening, mat og hvile.
Returner i JSON-format som spesifisert.`
}

/**
 * Get days ago text
 */
function getDaysAgo(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'I dag'
  if (diffDays === 1) return 'I går'
  return `${diffDays} dager siden`
}
