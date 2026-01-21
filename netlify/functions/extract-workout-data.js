import Anthropic from '@anthropic-ai/sdk'

// Netlify Function configuration
export const config = {
  timeout: 30 // 30 seconds for OCR processing
}

const OCR_SYSTEM_PROMPT = `Du er en AI-assistent som ekstraerer treningsdata fra bilder. Du kan lese:
1. Bilder fra treningsapper (Garmin, Strava, Apple Watch, etc.)
2. Whiteboards/tavler fra CrossFit/Hyrox-sentre (håndskrevet eller marker)
3. Screenshots av treningsprogrammer

Din oppgave er å:
1. Identifisere type treningsøkt (løping, styrke, Hyrox, CrossFit, etc.)
2. Ekstrahere nøkkeldata som distanse, tid, tempo, puls, høydemeter, RPE, etc.
3. For CrossFit/Hyrox whiteboards: Parse WOD-format (AMRAP, EMOM, For Time, Chipper, etc.) og estimer RPE
4. Returnere data i et strukturert JSON-format

## CrossFit/Hyrox Whiteboard-gjenkjenning:
- Gjenkjenn vanlige formater: WOD (Workout of the Day), AMRAP, EMOM, For Time, Tabata, Chipper
- Ekstraher øvelser, repetisjoner, vekter, distanser, tidsrammer
- Estimer RPE basert på:
  * Volum (antall runder/repetisjoner)
  * Intensitet (tung vekt, høy hastighet, korte pauser)
  * Varighet (lengre økter = lavere intensitet per runde)
  * Øvelseskompleksitet (tekniske løft = høyere intensitet)
  * Kombinasjoner (mange ulike bevegelser = høyere)

RPE-estimering guide:
- RPE 3-4: Lett teknikk/recovery, lav intensitet, god pause
- RPE 5-6: Moderat tempo, kontrollert, medium volum
- RPE 7-8: Høy intensitet, tung vekt ELLER høyt tempo, begrenset pause
- RPE 9-10: Max effort, tung vekt OG høyt tempo, minimal pause, lange økter

## Output-format:
Returner alltid en strukturert JSON med følgende format:
{
  "detected": true/false,  // Om du klarte å identifisere treningsdata
  "confidence": "high|medium|low",  // Hvor sikker du er på dataene
  "workoutType": "easy_run|tempo|interval|long_run|hyrox|crossfit|strength|recovery|other",
  "data": {
    "title": "string - kort beskrivende tittel (f.eks. 'AMRAP 20min' eller 'Hyrox Simulation')",
    "date": "YYYY-MM-DD",  // Ekstrahert dato hvis synlig
    "duration": number,  // Varighet i minutter (estimer basert på WOD-format hvis ikke oppgitt)
    "distance": number,  // Distanse i km (for løping)
    "avgPace": "MM:SS",  // Gjennomsnittlig tempo (for løping)
    "avgHR": number,  // Gjennomsnittlig puls
    "maxHR": number,  // Maks puls
    "elevation": number,  // Høydemeter
    "surface": "road|trail|track|treadmill",  // Underlag hvis synlig
    "rpe": number,  // RPE 1-10 - ALLTID estimer dette for CrossFit/Hyrox basert på workout-intensitet
    "notes": "string - full workout-beskrivelse med øvelser, reps, vekter, format"
  },
  "suggestions": "string - forslag til brukeren om data som bør verifiseres eller legges til manuelt"
}

## Viktig for whiteboards:
- Håndskrift kan være uleselig - gjør ditt beste og nevn usikkerhet i suggestions
- Inkluder HELE workout-beskrivelsen i notes-feltet
- Estimer ALLTID RPE for CrossFit/Hyrox-økter basert på intensitet
- Estimer varighet hvis ikke oppgitt (typisk 10-60 min for CrossFit WODs)

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

Dette kan være:
1. Screenshot fra treningsapp (Garmin, Strava, Apple Watch, etc.)
2. Whiteboard/tavle fra CrossFit/Hyrox-senter med WOD (Workout of the Day)
3. Treningsprogram eller workout-plan

Se etter:
- Type trening (løping, CrossFit, Hyrox, styrke, etc.)
- For whiteboards: WOD-format (AMRAP, EMOM, For Time, etc.), øvelser, reps, vekter
- Distanse, varighet/tid, tempo/hastighet
- Puls (snitt og maks)
- Høydemeter/elevation
- Dato
- Estimer RPE (1-10) basert på workout-intensitet hvis dette er CrossFit/Hyrox

VIKTIG: For CrossFit/Hyrox whiteboards:
- Inkluder full workout-beskrivelse i notes-feltet
- Estimer RPE basert på volum, intensitet, varighet og kompleksitet
- Estimer varighet hvis ikke oppgitt (typisk 10-60 min)

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
