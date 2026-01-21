import Anthropic from '@anthropic-ai/sdk'

// Netlify Function configuration
export const config = {
  timeout: 60 // 60 seconds for multi-image OCR processing
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
  "imageSource": "whiteboard|garmin|strava|watch|app|other", // Hva slags kilde dette er
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

const MERGE_SYSTEM_PROMPT = `Du er en AI-assistent som merger treningsdata fra flere kilder til én komplett treningslogg.

Du mottar 2-3 separate datasett ekstraert fra ulike bilder (f.eks. whiteboard + Garmin + Strava).

Din oppgave er å:
1. Identifisere hvilken kilde som gir hvilken type data
2. Merge dataene intelligent - ta det beste fra hver kilde
3. Løse konflikter (f.eks. hvis to kilder gir ulik varighet)
4. Returnere ett komplett, merged datasett

## Merge-prioritering:
**For strukturert data (øvelser, WOD-format, program):**
- Prioriter whiteboard/tavle som primærkilde
- Bruk Garmin/klokke for å validere/supplere

**For objektive målinger (puls, distanse, tid, tempo):**
- Prioriter Garmin/klokke/app som primærkilde (mest nøyaktig)
- Bruk whiteboard kun hvis Garmin mangler data

**For subjektive vurderinger (RPE):**
- Ta RPE fra whiteboard hvis tilgjengelig (coach-vurdert)
- Ellers bruk estimert RPE fra pulsdata hvis tilgjengelig

## Konflikt-håndtering:
- Hvis to kilder gir ulik varighet: Bruk Garmin/klokke (mest presis)
- Hvis to kilder gir ulik distanse: Bruk Garmin/GPS (mest nøyaktig)
- Hvis to kilder gir ulik dato: Bruk Garmin/timestamp (mest pålitelig)

## Output-format:
Samme JSON-struktur som for enkelbildeEkstraksjon, men med tilleggsfel:
{
  ...alle vanlige felt...
  "dataSources": ["whiteboard", "garmin", "strava"],  // Hvilke kilder som ble brukt
  "mergedFrom": {
    "title": "whiteboard",
    "duration": "garmin",
    "distance": "garmin",
    "avgHR": "garmin",
    "notes": "whiteboard",
    ...  // Hvor hver data kom fra
  },
  "conflicts": ["duration: whiteboard sa 45min, garmin målte 43min - brukte garmin"],
  "suggestions": "Merged data fra whiteboard (workout-struktur) og Garmin (puls/tid/distanse). Verifiser at alt stemmer."
}

Vær intelligent: Kombiner det beste fra hver kilde for å lage den mest komplette og nøyaktige loggen.
`

async function extractSingleImage(client, imageData, imageType) {
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

VIKTIG: Identifiser kildetypen (imageSource) - er dette whiteboard, garmin, strava, watch, eller app?

For CrossFit/Hyrox whiteboards:
- Inkluder full workout-beskrivelse i notes-feltet
- Estimer RPE basert på volum, intensitet, varighet og kompleksitet
- Estimer varighet hvis ikke oppgitt (typisk 10-60 min)

Returner dataene i JSON-formatet spesifisert i system-prompten.
`

  const message = await client.messages.create({
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

  const content = message.content[0]?.text
  if (!content) {
    throw new Error('AI response is empty')
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from AI response')
  }

  return JSON.parse(jsonMatch[0])
}

async function mergeWorkoutData(client, extractedDataArray) {
  const prompt = `
Jeg har ekstraert treningsdata fra ${extractedDataArray.length} ulike bilder av samme treningsøkt.

Hver kilde inneholder ulike deler av dataene:
${extractedDataArray.map((data, i) => `
Kilde ${i + 1} (${data.imageSource || 'ukjent'}):
${JSON.stringify(data, null, 2)}
`).join('\n')}

Merge disse til ÉN komplett treningslogg ved å:
1. Identifisere hva hver kilde er best på (whiteboard = øvelser, Garmin = målinger)
2. Ta det beste/mest nøyaktige fra hver kilde
3. Løse eventuelle konflikter intelligent
4. Lage én komplett, merged treningslogg

Returner merged data i samme JSON-format, men inkluder også:
- dataSources: array av kilder som ble brukt
- mergedFrom: objekt som viser hvor hver verdi kom fra
- conflicts: array av konflikter som ble løst

VIKTIG:
- Prioriter Garmin/klokke for objektive målinger (tid, distanse, puls)
- Prioriter whiteboard for workout-struktur og øvelser
- Kombiner notes fra alle kilder
`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: MERGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  })

  const content = message.content[0]?.text
  if (!content) {
    throw new Error('AI merge response is empty')
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from AI merge response')
  }

  return JSON.parse(jsonMatch[0])
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    if (!event.body) {
      throw new Error('Request body is required')
    }

    const body = JSON.parse(event.body)

    // Support both single image (imageData) and multiple images (images array)
    const images = body.images || (body.imageData ? [{ data: body.imageData, type: body.imageType || 'image/jpeg' }] : [])

    if (images.length === 0) {
      throw new Error('At least one image is required')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured')
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    console.log(`Processing ${images.length} image(s) for workout extraction`)

    // Extract data from each image
    const extractedDataArray = []
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      console.log(`Extracting image ${i + 1}/${images.length}`)

      try {
        const result = await extractSingleImage(client, image.data, image.type || 'image/jpeg')
        if (result.detected) {
          extractedDataArray.push(result)
        }
      } catch (error) {
        console.error(`Error extracting image ${i + 1}:`, error.message)
        // Continue with other images even if one fails
      }
    }

    if (extractedDataArray.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          detected: false,
          message: 'Kunne ikke identifisere treningsdata i noen av bildene. Prøv tydeligere bilder.'
        })
      }
    }

    // If only one image or one successful extraction, return it directly
    if (extractedDataArray.length === 1) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(extractedDataArray[0])
      }
    }

    // Multiple images detected - merge them
    console.log(`Merging ${extractedDataArray.length} extracted datasets`)
    const mergedData = await mergeWorkoutData(client, extractedDataArray)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mergedData)
    }
  } catch (error) {
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
