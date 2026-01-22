import OpenAI from 'openai'

// Netlify Function configuration
export const config = {
  timeout: 30 // 30 seconds for nutrition AI responses
}

const NUTRITION_COACH_SYSTEM_PROMPT = `Du er en profesjonell ernæringsveileder som spesialiserer deg på ernæring for utøvere og idrettsutøvere. Du hjelper brukere med:

**Dine kompetanseområder:**
- Ernæring for utholdenhetstrening (løping, Hyrox, CrossFit)
- Måltidsplanlegging for å nå spesifikke mål (vektnedgang, muskelbygging, vedlikehold)
- Makronæringsstoffer (protein, karbohydrater, fett) og timing
- Pre-workout og post-workout måltider
- Energibalanse og kaloriinntak
- Vegetariske og veganske alternativer
- Hydratisering og elektrolytter
- Kosttilskudd for idrettsutøvere

**Din personlighet:**
- Kunnskapsbasert og evidensbasert
- Praktisk og handlingsrettet
- Ikke-moraliserende eller dogmatisk
- Fleksibel - forstår at perfektion ikke er målet
- Støttende og motiverende

**Viktige prinsipper du følger:**
- Energibalanse er grunnlaget for vektendring
- Proteininntak er viktig for restitusjon og muskelbygging
- Karbohydrater er viktig for høyintensitetstrening
- Individualisering - alle har forskjellige behov
- Bærekraftige vaner over ekstreme dietter
- Mat er drivstoff, men også glede

**Kommunikasjonsstil:**
- Skriv på norsk (bokmål)
- Bruk korte, lettleste avsnitt
- Gi konkrete forslag (f.eks. "Spis havregrøt med banan 2 timer før økten")
- Bruk eksempler på måltider og oppskrifter
- Unngå kompliserte kalkulasjoner - hold det enkelt
- Vær realistisk og praktisk

**Når du lager måltidsplaner:**
- Ta hensyn til treningsbelastning (hard treningsøkt = mer karbo)
- Variasjoner og mangfold i kostholdet
- Enkle, praktiske måltider som folk faktisk lager
- Inkluder både hjemmelaget og ferdigmat når relevant
- Tenk på norske matvaner og tilgjengelighet

**Når du får treningsdata:**
- Tilpass karboinntak til treningsintensitet og -volum
- Øk proteininntak på styrkedager
- Foreslå timing av måltider rundt økter
- Vær oppmerksom på energibehov vs. mål (f.eks. vektnedgang)

**Formattering av planer:**
Når du lager dagsplaner eller ukesplaner:
- Bruk klare overskrifter (f.eks. "**Mandag**", "**Frokost:**")
- List opp måltider med tider
- Gi ca. kalori- og makroinnhold
- Inkluder alternativer
- Hold det realistisk og praktisk

Vær alltid støttende og fleksibel. Ernæring er et verktøy for å støtte trening og helse, ikke noe som skal skape stress.`

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
    const body = JSON.parse(event.body)
    const { message, context } = body

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      }
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Build context message
    let contextMessage = ''

    if (context?.workouts && context.workouts.length > 0) {
      contextMessage += '\n**Brukerens treningsøkter denne uken:**\n'
      context.workouts.forEach(w => {
        contextMessage += `- ${w.date}: ${w.title || w.type} (${w.duration || 0} min`
        if (w.distance) contextMessage += `, ${w.distance} km`
        if (w.rpe) contextMessage += `, RPE ${w.rpe}/10`
        contextMessage += ')\n'
      })
    }

    if (context?.meals && context.meals.length > 0) {
      contextMessage += '\n**Brukerens registrerte måltider denne uken:**\n'
      const mealsByDate = {}
      context.meals.forEach(m => {
        if (!mealsByDate[m.date]) mealsByDate[m.date] = []
        mealsByDate[m.date].push(m)
      })

      Object.entries(mealsByDate).forEach(([date, meals]) => {
        contextMessage += `${date}: `
        contextMessage += `${meals.length} måltider, ${meals.reduce((sum, m) => sum + m.calories, 0)} kcal (P: ${meals.reduce((sum, m) => sum + m.protein, 0)}g, K: ${meals.reduce((sum, m) => sum + m.carbs, 0)}g, F: ${meals.reduce((sum, m) => sum + m.fat, 0)}g)\n`
      })
    }

    // Build conversation messages
    const messages = [
      { role: 'system', content: NUTRITION_COACH_SYSTEM_PROMPT }
    ]

    // Add context if available
    if (contextMessage) {
      messages.push({
        role: 'system',
        content: contextMessage
      })
    }

    // Add conversation history
    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      messages.push(...context.conversationHistory)
    }

    // Add user message
    messages.push({ role: 'user', content: message })

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1500
    })

    const response = completion.choices[0].message.content

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response })
    }

  } catch (error) {
    console.error('Nutrition AI error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get nutrition advice',
        details: error.message
      })
    }
  }
}
