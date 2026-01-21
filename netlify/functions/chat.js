import OpenAI from 'openai'

// Netlify Function configuration
export const config = {
  timeout: 30 // 30 seconds for chat responses
}

const TRAINING_COACH_SYSTEM_PROMPT = `Du er en vennlig og kunnskapsrik personlig treningscoach som spesialiserer deg på løping, Hyrox og funksjonell fitness. Du hjelper brukere med:

**Dine kompetanseområder:**
- Løpetrening (5K til maraton, teknikk, tempo, intervaller)
- Hyrox og CrossFit trening
- Styrketrening og mobilitet
- Treningsplanlegging og periodisering
- Skadeforebygging og restitusjon
- Ernæring og søvn for prestasjoner
- Motivasjon og mental trening

**Din personlighet:**
- Vennlig, støttende og motiverende
- Kunnskapsbasert - bruker treningsvitenskapelige prinsipper
- Praktisk - gir konkrete, handlingsrettede råd
- Personlig - tilpasser svar til brukerens situasjon
- Ærlig - sier ifra hvis noe er usikkert eller farlig

**Viktige prinsipper du følger:**
- 80/20-regelen for utholdenhetstrening
- Progressiv overbelastning
- Individualitet - alle er forskjellige
- Restitusjon er like viktig som trening
- Langsiktig progresjon over raske resultater

**Kommunikasjonsstil:**
- Skriv på norsk (bokmål)
- Bruk korte, lettleste avsnitt
- Vær personlig og engasjerende
- Still oppfølgingsspørsmål når relevant
- Bruk analogier og eksempler for å forklare konsepter
- Unngå for mye fagsjargong, men forklar begreper når du bruker dem

**Når du får treningsdata:**
- Analyser trenden, ikke bare enkelttall
- Se etter røde flagg (overtrening, ubalanse)
- Gi konstruktive forslag til forbedring
- Feire fremgang og milepæler

Vær alltid positiv, men ærlig. Hvis brukeren planlegger noe risikabelt eller usunt, si ifra på en støttende måte.

**VIKTIG - Planmodifikasjoner:**
Når brukeren ber om å endre treningsplanen (f.eks. "flytt økten til i morgen", "legg til en intervalløkt", "reduser belastningen"), bruk tilgjengelige funksjoner for å foreslå endringer. Forklar alltid HVORFOR du foreslår endringen, og be om bekreftelse før den utføres.`

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

    const { messages, userContext } = JSON.parse(event.body)

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages array is required in request body')
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Build system prompt with user context
    let systemPrompt = TRAINING_COACH_SYSTEM_PROMPT

    if (userContext) {
      systemPrompt += `\n\n**BRUKERENS KONTEKST:**\n`

      if (userContext.recentWorkouts && userContext.recentWorkouts.length > 0) {
        systemPrompt += `\nSiste treningsøkter (${userContext.recentWorkouts.length} økter):\n`
        systemPrompt += JSON.stringify(userContext.recentWorkouts.map(w => ({
          date: w.date,
          type: w.type,
          duration: w.duration,
          distance: w.running?.distance,
          rpe: w.rpe
        })), null, 2)
      }

      if (userContext.currentPlan) {
        systemPrompt += `\n\nNåværende treningsplan:\n`
        systemPrompt += `Fokus: ${userContext.currentPlan.focus}\n`
        systemPrompt += `Ukentlig løping: ${userContext.currentPlan.totalLoad?.running_km || 0} km\n`
        systemPrompt += `Styrkeøkter: ${userContext.currentPlan.totalLoad?.strength_sessions || 0}\n`
      }

      if (userContext.stats) {
        systemPrompt += `\n\nStatistikk siste 28 dager:\n`
        systemPrompt += JSON.stringify(userContext.stats, null, 2)
      }

      if (userContext.goals) {
        systemPrompt += `\n\nBrukerens mål:\n${userContext.goals}\n`
      }
    }

    // Define available tools for plan modification
    const tools = [
      {
        type: 'function',
        function: {
          name: 'update_session',
          description: 'Oppdater en eksisterende treningsøkt i planen (endre type, varighet, intensitet, etc.)',
          parameters: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID til økten som skal oppdateres'
              },
              changes: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Ny treningstype' },
                  title: { type: 'string', description: 'Ny tittel' },
                  description: { type: 'string', description: 'Ny beskrivelse' },
                  duration_minutes: { type: 'number', description: 'Ny varighet i minutter' },
                  distance_km: { type: 'number', description: 'Ny distanse i km' }
                }
              },
              reason: {
                type: 'string',
                description: 'Begrunnelse for endringen (forklart til brukeren)'
              }
            },
            required: ['sessionId', 'changes', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'move_session',
          description: 'Flytt en treningsøkt til en annen dag',
          parameters: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID til økten som skal flyttes'
              },
              newDay: {
                type: 'string',
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                description: 'Ny dag for økten'
              },
              reason: {
                type: 'string',
                description: 'Begrunnelse for flyttingen'
              }
            },
            required: ['sessionId', 'newDay', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_session',
          description: 'Legg til en ny treningsøkt i planen',
          parameters: {
            type: 'object',
            properties: {
              day: {
                type: 'string',
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                description: 'Dag for ny økt'
              },
              type: {
                type: 'string',
                description: 'Type treningsøkt (easy_run, tempo, interval, strength, etc.)'
              },
              title: {
                type: 'string',
                description: 'Tittel på økten'
              },
              description: {
                type: 'string',
                description: 'Detaljert beskrivelse'
              },
              duration_minutes: {
                type: 'number',
                description: 'Varighet i minutter'
              },
              distance_km: {
                type: 'number',
                description: 'Distanse i km (for løping)'
              },
              reason: {
                type: 'string',
                description: 'Hvorfor denne økten legges til'
              }
            },
            required: ['day', 'type', 'title', 'duration_minutes', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_session',
          description: 'Fjern en treningsøkt fra planen',
          parameters: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID til økten som skal fjernes'
              },
              reason: {
                type: 'string',
                description: 'Begrunnelse for fjerning'
              }
            },
            required: ['sessionId', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'adjust_plan_load',
          description: 'Juster total ukentlig belastning (øk/reduser km, antall økter, intensitet)',
          parameters: {
            type: 'object',
            properties: {
              adjustment: {
                type: 'string',
                enum: ['increase', 'decrease', 'maintain'],
                description: 'Øk, reduser eller behold belastning'
              },
              percentage: {
                type: 'number',
                description: 'Prosentvis endring (f.eks. 10 for 10% økning)'
              },
              reason: {
                type: 'string',
                description: 'Begrunnelse for justeringen'
              }
            },
            required: ['adjustment', 'percentage', 'reason']
          }
        }
      }
    ]

    // Call OpenAI API with tools
    let response
    try {
      response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: userContext?.currentPlan ? tools : undefined, // Only enable tools if user has a plan
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.3,
        frequency_penalty: 0.3
      })
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      throw new Error(`AI API error: ${apiError.message || 'Unknown error'}`)
    }

    const assistantMessage = response.choices[0]?.message
    if (!assistantMessage) {
      throw new Error('No response from AI')
    }

    // Check if AI wants to call a tool
    const toolCalls = assistantMessage.tool_calls
    if (toolCalls && toolCalls.length > 0) {
      // Parse tool calls and return them for frontend confirmation
      const actions = toolCalls.map(call => {
        try {
          return {
            id: call.id,
            function: call.function.name,
            arguments: JSON.parse(call.function.arguments)
          }
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e)
          return null
        }
      }).filter(Boolean)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: assistantMessage.content || 'Jeg foreslår følgende endringer:',
          actions, // Actions that need user confirmation
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        })
      }
    }

    // No tool calls, just return the message
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: assistantMessage.content,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        }
      })
    }
  } catch (error) {
    // Enhanced error logging
    console.error('Error in chat function:', {
      message: error.message,
      stack: error.stack
    })

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to process chat message',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}
