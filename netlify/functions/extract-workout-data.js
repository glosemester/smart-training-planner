import Anthropic from '@anthropic-ai/sdk'

// Netlify Function configuration
export const config = {
  timeout: 30 // 30 seconds for OCR processing
}

const OCR_SYSTEM_PROMPT = `Du er en AI-assistent som ekstraerer treningsdata fra bilder. Du kan lese bilder fra treningsapper som Garmin, Strava, Apple Watch, etc., og ekstrahere relevant treningsinformasjon.

Din oppgave er å:
1. Identifisere type treningsøkt (løping, styrke, Hyrox, CrossFit, etc.)
2. Ekstrahere nøkkeldata som distanse, tid, tempo, puls, høydemeter, RPE, etc.
3. Returnere data i et strukturert JSON-format

Output-format: Returner alltid en strukturert JSON med følgende format:
{
  "detected": true/false,  // Om du klarte å identifisere treningsdata
  "confidence": "high|medium|low",  // Hvor sikker du er på dataene
  "workoutType": "easy_run|tempo|interval|long_run|hyrox|crossfit|strength|recovery|other",
  "data": {
    "title": "string - kort beskrivende tittel",
    "date": "YYYY-MM-DD",  // Ekstrahert dato hvis synlig
    "duration": number,  // Varighet i minutter
    "distance": number,  // Distanse i km (for løping)
    "avgPace": "MM:SS",  // Gjennomsnittlig tempo (for løping)
    "avgHR": number,  // Gjennomsnittlig puls
    "maxHR": number,  // Maks puls
    "elevation": number,  // Høydemeter
    "surface": "road|trail|track|treadmill",  // Underlag hvis synlig
    "rpe": number,  // RPE 1-10 hvis synlig eller estimert
    "notes": "string - eventuelle ekstra notater eller observasjoner"
  },
  "suggestions": "string - forslag til brukeren om data som bør verifiseres eller legges til manuelt"
}

Vær konservativ: Hvis du er usikker på en verdi, sett den til null og nevn det i suggestions.
Kommuniser på norsk i suggestions og notes.
`

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

    const { imageData, imageType = 'image/jpeg' } = JSON.parse(event.body)

    if (!imageData) {
      throw new Error('imageData is required in request body')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured')
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    // Prepare image for Claude API
    // imageData should be base64 encoded without the data:image prefix
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '')

    const prompt = `
Analyser dette bildet av en treningsøkt og ekstraher all relevant treningsdata.

Se etter:
- Type trening (løping, sykling, styrke, etc.)
- Distanse
- Varighet/tid
- Tempo/hastighet
- Puls (snitt og maks)
- Høydemeter/elevation
- Dato
- Eventuelle notater eller spesielle observasjoner

Returner dataene i JSON-formatet spesifisert i system-prompten.
`

    // Call Anthropic API with vision
    let message
    try {
      message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: OCR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
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

    // Validate result structure
    if (!result.detected) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          detected: false,
          message: 'Kunne ikke identifisere treningsdata i bildet. Prøv et tydeligere bilde av treningssammendrag.'
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
    console.error('Error extracting workout data:', {
      message: error.message,
      stack: error.stack
    })

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to extract workout data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}
