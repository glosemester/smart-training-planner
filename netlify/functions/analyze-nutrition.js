import OpenAI from 'openai'

// Netlify Function configuration
export const config = {
  timeout: 20 // 20 seconds for nutrition analysis
}

const NUTRITION_SYSTEM_PROMPT = `Du er en ekspert på mat og ernæring. Din oppgave er å analysere matinntak og gi nøyaktige estimater på næringsinnhold.

**Dine oppgaver:**
- Estimere kalorier (kcal) for måltider
- Beregne makronæringsstoffer (protein, karbohydrater, fett i gram)
- Identifisere type måltid (frokost, lunsj, middag, snack)
- Gi konstruktive ernæringsråd når relevant

**Viktige prinsipper:**
- Vær konservativ med estimater - heller litt høyere enn lavere
- Bruk standard porsjoner hvis ikke spesifisert
- Ta hensyn til tilberedning (stekt vs kokt, osv.)
- Norske matmengder og tradisjoner
- Gi realistiske tall basert på vanlige oppskrifter

**Format:**
Returner alltid strukturert JSON med følgende format:
{
  "detected": true/false,
  "confidence": "high|medium|low",
  "mealType": "breakfast|lunch|dinner|snack",
  "items": [
    {
      "name": "string - ingrediens/rett",
      "amount": "string - mengde med enhet",
      "calories": number,
      "protein": number,  // gram
      "carbs": number,    // gram
      "fat": number       // gram
    }
  ],
  "totals": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "suggestions": "string - ernæringsråd eller kommentarer (valgfritt)"
}

**Eksempel:**
Input: "2 egg og 2 brødskiver med brunost"
Output:
{
  "detected": true,
  "confidence": "high",
  "mealType": "breakfast",
  "items": [
    { "name": "Egg", "amount": "2 stk", "calories": 140, "protein": 12, "carbs": 1, "fat": 10 },
    { "name": "Brød", "amount": "2 skiver", "calories": 160, "protein": 6, "carbs": 28, "fat": 2 },
    { "name": "Brunost", "amount": "~30g", "calories": 130, "protein": 3, "carbs": 14, "fat": 7 }
  ],
  "totals": { "calories": 430, "protein": 21, "carbs": 43, "fat": 19 }
}

Vær presis, praktisk og brukervennlig. Kommuniser på norsk.`

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

    const { description, mealType } = JSON.parse(event.body)

    if (!description) {
      throw new Error('description is required in request body')
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `Analyser dette måltidet og gi næringsinnhold:

"${description}"

${mealType ? `Hint: Dette er sannsynligvis ${mealType}` : ''}

Gi et detaljert estimat på kalorier og makronæringsstoffer i JSON-formatet spesifisert.`

    // Call OpenAI API
    let response
    try {
      response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent estimates
        max_tokens: 1000
      })
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      throw new Error(`AI API error: ${apiError.message || 'Unknown error'}`)
    }

    const content = response.choices[0]?.message?.content
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

    // Validate result structure
    if (!result.detected) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          detected: false,
          message: 'Kunne ikke identifisere mat i beskrivelsen. Prøv å være mer spesifikk.'
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } catch (error) {
    // Enhanced error logging
    console.error('Error analyzing nutrition:', {
      message: error.message,
      stack: error.stack
    })

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to analyze meal',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}
