const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors')({ origin: true });
const { validatePlan } = require('./training/validation');

admin.initializeApp();

// --- Configuration ---
// Access API key from environment variables
const getGeminiKey = () => process.env.GEMINI_API_KEY;

// --- Helper: Initialize Gemini ---
const formatGeminiError = (error) => {
    console.error("Gemini API Error:", error);
    throw new HttpsError('internal', error.message || 'Error processing AI request');
};

// ==========================================
// 1. GENERATE PLAN (High Timeout)
// ==========================================
exports.generatePlan = onCall({
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: ["GEMINI_API_KEY"],
    cors: true
}, async (request) => {
    // Auth check (optional, but recommended)
    // if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in');

    const { userData, type = 'generate', chunkInfo } = request.data;
    const apiKey = getGeminiKey();

    if (!apiKey) throw new HttpsError('failed-precondition', 'API Key not configured');
    if (!userData) throw new HttpsError('invalid-argument', 'userData is required');

    const genAI = new GoogleGenerativeAI(apiKey);

    // System Prompt
    const TRAINING_SYSTEM_PROMPT = `Du er en JSON-generator. Svar KUN med rå JSON. Ingen tekst, forklaringer eller markdown-formatering.
Du er en erfaren treningsplanlegger som spesialiserer seg på utholdenhetstrening og funksjonell fitness. Du lager treningsplaner for en person som trener løping (hovedfokus), Hyrox og CrossFit.

Viktige prinsipper du følger:
- 80/20-regelen: 80% lav intensitet, 20% høy intensitet for løping
- Progressiv overbelastning: Maks 10% økning i ukentlig volum OG langturdistanse
- Periodisering: Bygg opp mot konkurranser med riktig tapering
- Recovery: Vurder søvn, stress og tidligere belastning
- Balanse: Kombiner løping med styrke uten overtrening
- Individualitet: Tilpass til personens mål, tid og preferanser

**KRITISK: PROGRESSIVE LONG RUNS**
For ALLE løpsdistanser må langturer bygges progressivt:
- Start med 50-60% av konkurransedistanse (minimum 8-10 km)
- Øk med 1-2 km per uke (aldri mer enn 10%)
- Peak long run: 80-120% av konkurransedistanse (avhengig av distanse)
- Eksempel 65km race: Uke 1: 10km → Uke 4: 15km → Uke 8: 25km → Uke 12: 40km → Uke 16: 55km
- Eksempel 21km race: Uke 1: 10km → Uke 4: 14km → Uke 8: 18km → Uke 10: 21km
- Taper: Reduser langtur med 30-50% de siste 2 ukene

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

Output-format: Returner alltid en strukturert JSON med følgende format for FLERUKERS planlegging:
{
  "planDuration": number (antall uker totalt),
  "goalInfo": "string - oppsummering av mål og periode",
  "weeks": [
    {
      "weekNumber": number (1, 2, 3...),
      "weekStartDate": "ISO date string for mandagen i uken",
      "phase": "base|build|peak|taper",
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
          "description": "string - KORT beskrivelse (maks 2 setninger)",
          "purpose": "string - Hensikten med økten (f.eks. 'Bygge utholdenhet', 'Restitusjon')",
          "rpe_target": "string - Ønsket følelse/RPE (f.eks. 'Lett og ledig, RPE 3', 'Hardt, RPE 8')",
          "coach_tip": "string - Ett teknisk fokuspunkt (f.eks. 'Høy frekvens', 'Rolig pust')",
          "duration_minutes": number,
          "details": {
            "distance_km": number,
            "pace_zone": "Z1|Z2|Z3|Z4|Z5",
            "intervals": "string beskrivelse hvis aktuelt",
            "exercises": ["øvelse1", "øvelse2"],
            "format": "string - f.eks. EMOM, AMRAP, For Time"
          }
        }
      ],
      "weeklyTips": ["string tips (maks 2 tips per uke, maks 30 tokens hver)"]
    }
  ],
  "overallStrategy": "string - overordnet strategi for hele perioden",
  "milestones": ["string - viktige milepæler i planen"]
}`;

    try {
        const systemPrompt = type === 'adjust'
            ? "Du er en ekspert på treningsplanlegging. Gi korte, presise analyser og forslag. SVAR KUN MED JSON."
            : TRAINING_SYSTEM_PROMPT;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt + "\n\nKRITISK REGEL: Du MÅ svare med KUN rå JSON. Start svaret med { og avslutt med }. ALDRI inkluder tekst, forklaringer, markdown eller kommentarer utenfor JSON-objektet."
        });

        let prompt;
        if (type === 'adjust') {
            const { originalPlan, actualWorkouts } = userData;
            prompt = `
Basert på den opprinnelige treningsplanen og hva som faktisk ble gjennomført, gi konkrete forslag til justeringer.

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
}`;
        } else {
            prompt = buildUserPrompt(userData, chunkInfo);
        }

        console.log('Generating plan with prompt length:', prompt.length);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // 1. Isoler objektet mellom første { og siste } for å fjerne AI-prat
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            console.error("Ingen JSON funnet i AI-svar", { raw: text });
            throw new HttpsError('internal', "AI-en svarte ikke i JSON-format.");
        }

        let jsonString = text.substring(start, end + 1);

        // 2. TEKNISK RENSING: Fjern ulovlige kontrolltegn og linjeskift inne i tekststrenger
        // Dette hindrer krasj ved lange treningsbeskrivelser
        jsonString = jsonString
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");

        let parsedPlan;
        try {
            parsedPlan = JSON.parse(jsonString);
        } catch (e) {
            // Siste utvei hvis parsing feiler: Super-rens
            try {
                const fallbackClean = text.substring(start, end + 1).replace(/\s+/g, " ");
                parsedPlan = JSON.parse(fallbackClean);
            } catch (e2) {
                console.error("Kritisk JSON-feil", { raw: text });
                throw new HttpsError('internal', "AI-formatet var ugyldig. Vennligst prøv igjen.");
            }
        }

        // VALIDERING: Enforce HARD RULES
        console.log('Validating plan against HARD RULES...');
        const validation = validatePlan(parsedPlan, userData);

        if (!validation.isValid) {
            console.error('HARD RULES VIOLATIONS:', validation.violations);
            throw new HttpsError(
                'failed-precondition',
                `AI violated HARD RULES:\n${validation.violations.slice(0, 3).join('\n')}`
            );
        }

        console.log('✅ Plan validation passed');
        return parsedPlan;

    } catch (error) {
        if (error.code === 'internal') throw error; // Re-throw HttpsError
        return formatGeminiError(error);
    }
});

// ==========================================
// 2. CHAT COACH
// ==========================================
exports.chat = onCall({
    timeoutSeconds: 60,
    secrets: ["GEMINI_API_KEY"],
    cors: true
}, async (request) => {
    const { messages, userContext } = request.data;
    const apiKey = getGeminiKey();
    if (!apiKey) throw new HttpsError('failed-precondition', 'API Key missing');

    const genAI = new GoogleGenerativeAI(apiKey);

    // Forbered kontekst-streng
    let contextString = "";

    if (userContext) {
        console.log("Mottok userContext med keys:", Object.keys(userContext));

        // Extract Mental State if present
        let mentalStatePrompt = "";
        if (userContext.mentalState) {
            const { beliefs, intentions } = userContext.mentalState;
            mentalStatePrompt = `
**DIN MENTALE TILSTAND (BDI MODEL):**
Du har følgende "tanker" om denne utøveren. Bruk dette til å styre rådene dine:

*TROSSETNINGER (Beliefs):*
${beliefs?.map(b => `- ${b.desc}`).join('\n') || "Ingen spesielle observasjoner."}

*INTENSJONER (Dine mål for samtalen):*
${intentions?.map(i => `- ${i.desc.toUpperCase()} (Prioritet!)`).join('\n') || "Vær hjelpsom."}

VIKTIG: Hvis du har en intensjon om "SUGGEST REST", må du foreslå hviledag selv om brukeren vil løpe.
`;
        }

        contextString = `
**GODKJENT DATATILGANG:**
Du har fått tildelt direkte tilgang til brukerens treningsdata. Dette er IKKE sensitivt, og du SKAL bruke det for å gi gode råd.
Her er dataene du har tilgang til (JSON):

${JSON.stringify(userContext, null, 2)}

${mentalStatePrompt}

**INSTRUKSJON FOR DATABRUK:**
1. HVIS brukeren spør om tidligere økter: Se i 'recentWorkouts'.
2. HVIS brukeren spør om plan: Se i 'currentPlan'.
3. Svar basert på "DIN MENTALE TILSTAND" ovenfor.
`;
    }

    // SYSTEM PROMPT MED ACTIONS DEFINISJON
    let systemPrompt = `Du er en backend-prosessor. Svar KUN med rå JSON. Ingen tekst, ingen markdown (\`\`\`), ingen forklaringer.

SPRÅK: Du MÅ svare på NORSK BOKMÅL. ALDRI svensk, dansk eller andre språk.

${contextString}

Du er en vennlig og kunnskapsrik personlig treningscoach som spesialiserer deg på løping, Hyrox og funksjonell fitness.

**FORMAT:**
Du skal returnere JSON med følgende struktur:
{
  "message": "Ditt svar til brukeren her...",
  "actions": [] // Valgfritt array med handlinger
}


**ACTIONS:**
Hvis brukeren ber om endringer i planen, legg til handlinger i "actions"-listen. 
VIKTIG: Du MÅ finne riktig "sessionId" fra "currentPlan" i konteksten når du skal endre, flytte eller slette. 
Hvis du ikke finner sessionId, spør brukeren hvilken økt de mener.

Her er de lovlige handlingene (inkluder ALLTID "reason"):

1. Endre en økt:
{
  "function": "update_session",
  "arguments": {
    "sessionId": "økt_id_fra_current_plan", 
    "changes": { "description": "ny beskrivelse", "duration_minutes": 60 },
    "reason": "Begrunnelse for endringen"
  }
}

2. Flytte en økt:
{
  "function": "move_session",
  "arguments": {
    "sessionId": "økt_id_fra_current_plan",
    "newDay": "tuesday", // monday, tuesday, wednesday, thursday, friday, saturday, sunday
    "reason": "Begrunnelse for flytting"
  }
}

3. Legge til en økt:
{
  "function": "add_session",
  "arguments": {
    "day": "wednesday",
    "type": "easy_run", // easy_run, tempo, interval, long_run, hyrox, crossfit, strength, rest
    "title": "Tittel",
    "description": "Beskrivelse",
    "duration_minutes": 45,
    "distance_km": 5, // Valgfritt
    "reason": "Begrunnelse for ny økt"
  }
}

4. Slette en økt:
{
  "function": "delete_session",
  "arguments": {
    "sessionId": "økt_id_fra_current_plan",
    "reason": "Begrunnelse for sletting"
  }
}

**DIN PERSONLIGHET:**
- Vennlig, støttende og motiverende
- Praktisk og løsningsorientert
- Skriv på norsk (bokmål) - ALDRI svensk!
`;

    // (Kontekst er nå injisert i toppen av prompten)

    try {

        const history = messages.slice(0, -1).map(msg => {
            const parts = [{ text: msg.content }];
            if (msg.image) {
                try {
                    const match = msg.image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
                    if (match) {
                        parts.push({
                            inlineData: {
                                mimeType: match[1],
                                data: match[2]
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error processing history image:", e);
                }
            }
            return {
                role: msg.role === 'user' ? 'user' : 'model',
                parts: parts
            };
        });

        const lastMsg = messages[messages.length - 1];
        const lastParts = [{ text: lastMsg.content }];

        if (lastMsg.image) {
            try {
                const match = lastMsg.image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
                if (match) {
                    lastParts.push({
                        inlineData: {
                            mimeType: match[1],
                            data: match[2]
                        }
                    });
                }
            } catch (e) {
                console.error("Error processing current image:", e);
            }
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt + "\n\nSVAR ER KUN GYLDIG JSON."
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastParts);
        const response = await result.response;
        let text = response.text();

        console.log('Raw AI response preview:', text.substring(0, 100));

        // 1. Isoler objektet mellom første { og siste }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            console.error("Ingen JSON brackets funnet i AI-svar", { raw: text });
            // Fallback: Return a simple message object wrapper
            return {
                message: text.replace(/`/g, '') || "Beklager, jeg kunne ikke generere et gyldig svar."
            };
        }

        let jsonString = text.substring(start, end + 1);

        // 2. RENSING: Fjern skadelige tegn
        jsonString = jsonString
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            //.replace(/\n/g, "\\n") // Gemini er ofte flink til å escape selv nå, dobbel escaping kan ødelegge
            .replace(/\r/g, "\\r");

        try {
            const parsed = JSON.parse(jsonString);

            // Validering
            if (!parsed.message && !parsed.actions) {
                return { message: text }; // Fallback hvis JSON er gyldig men tom/feil format
            }

            return parsed;

        } catch (e) {
            console.error("JSON parse feilet", { error: e.message, snippet: jsonString.substring(0, 100) });

            // Siste sjanse: Prøv å fikse "single quotes" til "double quotes" (vanlig hallusinasjon)
            try {
                const fixedJson = jsonString.replace(/'/g, '"');
                return JSON.parse(fixedJson);
            } catch (e2) {
                // Returner teksten inni JSON-klammer som melding hvis alt annet feiler
                const content = text.substring(start + 1, end).trim(); // Fjerner brutalt { }
                // Dette er ikke bra JSON, men vi kan prøve å redde teksten
                return {
                    message: "Beklager, teknisk feil i svaret. Her er råteksten: " + text
                };
            }
        }
    } catch (error) {
        if (error.code === 'internal') throw error;
        return formatGeminiError(error);
    }
});



// ==========================================
// 4. DAILY SUMMARY
// ==========================================
exports.generateDailySummary = onCall({
    timeoutSeconds: 60,
    secrets: ["GEMINI_API_KEY"],
    cors: true
}, async (request) => {
    const { data: summaryData } = request.data;
    const apiKey = getGeminiKey();
    if (!apiKey) throw new HttpsError('failed-precondition', 'API Key missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `Du er en personlig treningscoach som gir korte, motiverende daglige oppsummeringer.

KRITISK REGEL: Du MÅ svare med KUN rå JSON. Start svaret med { og avslutt med }. ALDRI inkluder tekst, forklaringer, markdown eller kommentarer utenfor JSON-objektet.

Hvis data mangler eller er tomt, returner:
{"headline":"Ingen aktiv plan","mood":"neutral","insights":["Du har ikke valgt en treningsplan ennå."],"recommendation":"Opprett en ny plan for å få daglige tips.","readinessScore":10}`
    });

    const prompt = buildSummaryPrompt(summaryData);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // 1. Isoler objektet mellom første { og siste } for å fjerne AI-prat
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            console.error("Ingen JSON funnet i AI-svar", { raw: text });
            // Fallback istedenfor crash
            return {
                headline: "Ingen oppsummering tilgjengelig",
                mood: "neutral",
                insights: ["Kunne ikke generere AI-svar."],
                recommendation: "Prøv igjen senere."
            };
        }

        let jsonString = text.substring(start, end + 1);

        // 2. TEKNISK RENSING: Fjern ulovlige kontrolltegn og linjeskift inne i tekststrenger
        jsonString = jsonString
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            // Siste utvei hvis parsing feiler: Super-rens
            try {
                const fallbackClean = text.substring(start, end + 1).replace(/\s+/g, " ");
                return JSON.parse(fallbackClean);
            } catch (e2) {
                console.error("Kritisk JSON-feil", { raw: text });
                // Returner fallback JSON
                return {
                    headline: "Teknisk feil med oppsummering",
                    mood: "neutral",
                    insights: ["AI-responsen var ugyldig.", "Vi jobber med saken."],
                    recommendation: "Prøv å oppdatere siden."
                };
            }
        }
    } catch (error) {
        console.error("Generell feil i generateDailySummary:", error);
        // Aldri crash med 500, returner alltid JSON
        return {
            headline: "Tjeneste utilgjengelig",
            mood: "warning",
            insights: ["Kunne ikke kontakte AI-tjenesten."],
            recommendation: "Prøv igjen om litt."
        };
    }
});

// ==========================================
// HELPERS
// ==========================================
function buildUserPrompt(userData, chunkInfo) {
    const {
        goal = {},
        trainingType,        // 'running_only' | 'hyrox_hybrid'
        sessionsPerWeek,     // 2-7
        availableDays = [],  // ['monday', 'wednesday', ...]
        blockedDays = [],    // ['tuesday', ...]
        startVolume,         // { mode, kmPerWeek, hoursPerWeek }
        stravaHistory
    } = userData;

    // Beregn tillatte dager (tilgjengelige minus blokkerte)
    const allowedDays = availableDays.filter(d => !blockedDays.includes(d));
    const allowedDaysStr = allowedDays.join(', ') || 'alle dager';
    const blockedDaysStr = blockedDays.length > 0 ? blockedDays.join(', ') : 'ingen';

    // Beregn startvolum
    let startKm = 20;
    if (startVolume?.kmPerWeek) {
        startKm = startVolume.kmPerWeek;
    } else if (stravaHistory?.weeklyAvgKm) {
        startKm = stravaHistory.weeklyAvgKm;
    }

    // ==========================================
    // HARD RULES - AI MÅ FØLGE DISSE
    // ==========================================
    let hardRules = `
🚨🚨🚨 UFRAVIKELIGE REGLER - BRYT ALDRI DISSE 🚨🚨🚨

1. TRENINGSTYPE: ${trainingType === 'running_only'
    ? `KUN LØPEØKTER!
   - ALDRI inkluder styrke, hyrox, crossfit økter
   - Tillatte typer: easy_run, tempo, interval, long_run, recovery, rest
   - INGEN andre økttyper er tillatt!`
    : `Hybrid plan med løping + styrke/Hyrox/CrossFit.
   - Inkluder både løpeøkter og styrke/Hyrox-økter`}

2. ANTALL ØKTER: Eksakt ${sessionsPerWeek || 4} treningsøkter per uke
   - Ikke flere, ikke færre
   - Resten av dagene skal være "rest"

3. TRENINGSDAGER: Økter KUN på disse dagene: ${allowedDaysStr}
   - ALDRI trening på: ${blockedDaysStr}
   - Alle andre dager skal ha type: "rest"

4. STARTVOLUM: Første uke starter på ca ${startKm} km løping
   - Øk med MAKS 10% per uke
   - Deload-uke hver 4. uke (reduser volum 30-40%)

KRITISK: Generer sessions for ALLE 7 dager i uken!
- Treningsdager (${allowedDaysStr}): Faktiske økter
- Andre dager: type: "rest", title: "Hviledag"
`;

    let goalInfo = "";
    if (goal.type === 'race') {
        goalInfo = `Mål: Race ${goal.distance || 'ukjent distanse'} dato ${goal.date || 'ikke satt'}`;
        if (goal.targetTime) {
            goalInfo += `, måltid: ${goal.targetTime}`;
        }
    } else {
        goalInfo = `Mål: ${goal.type || 'generell form'}`;
    }

    let chunkPrompt = "";
    if (chunkInfo) {
        const endWeek = chunkInfo.startWeek + chunkInfo.weeksPerChunk - 1;
        const weekRange = `uke ${chunkInfo.startWeek}-${endWeek}`;
        if (chunkInfo.isFirstChunk) {
            chunkPrompt = `Lag overordnet strategi og detaljer for ${weekRange}.`;
        } else {
            chunkPrompt = `Lag detaljer for ${weekRange} basert på strategi: ${chunkInfo.overallStrategy}`;
        }
    }

    // Bygg Strava-kontekst hvis tilgjengelig
    let stravaContext = "";
    if (stravaHistory && stravaHistory.hasEnoughData) {
        stravaContext = `
STRAVA-HISTORIKK (referanse):
- Ukentlig gjennomsnitt: ${stravaHistory.weeklyAvgKm} km
- Lengste løp: ${stravaHistory.longestRun} km
- Gjennomsnittspacing: ${stravaHistory.avgPace || 'ukjent'}/km`;
    }

    const weeksToGenerate = chunkInfo ? chunkInfo.weeksPerChunk : (userData.planDuration || 4);

    // Bestem tillatte økttyper basert på treningstype
    const allowedTypes = trainingType === 'running_only'
        ? 'easy_run|tempo|interval|long_run|recovery|rest'
        : 'easy_run|tempo|interval|long_run|hyrox|crossfit|strength|rest|recovery';

    return `VIKTIG: Svar KUN med JSON. Start med { og avslutt med }.

${hardRules}

${goalInfo}
${chunkPrompt}
${stravaContext}

SVAR MED DENNE EKSAKTE JSON-STRUKTUREN (${weeksToGenerate} uker, 7 dager per uke):
{
  "planDuration": ${weeksToGenerate},
  "goalInfo": "kort oppsummering av mål",
  "overallStrategy": "overordnet strategi for perioden",
  "milestones": ["milepæl 1", "milepæl 2"],
  "weeks": [
    {
      "weekNumber": 1,
      "weekStartDate": "2025-02-03",
      "phase": "base|build|peak|taper",
      "focus": "ukens fokus",
      "totalLoad": {
        "running_km": ${startKm},
        "strength_sessions": ${trainingType === 'running_only' ? 0 : 2},
        "estimated_hours": ${Math.round(startKm / 10 + (trainingType === 'running_only' ? 0 : 2))}
      },
      "sessions": [
        {
          "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
          "type": "${allowedTypes}",
          "title": "Tittel på økten",
          "description": "Kort beskrivelse",
          "purpose": "Hensikt med økten",
          "rpe_target": "RPE 3-4",
          "coach_tip": "Ett tips",
          "duration_minutes": 45,
          "details": {
            "distance_km": 8,
            "pace_zone": "Z2"
          }
        }
      ],
      "weeklyTips": ["tips 1"]
    }
  ]
}

HUSK:
- Start svaret med { og avslutt med }
- Generer 7 sessions per uke (alle dager)
- Følg HARD RULES over - ALDRI bryt disse!`;
}

function buildSummaryPrompt(data) {
    return `Basert på følgende treningsdata, generer en daglig oppsummering.

DATA:
${JSON.stringify(data, null, 2)}

SVAR BARE MED DENNE JSON-STRUKTUREN (ingen annen tekst):
{
  "headline": "Kort motiverende overskrift (maks 8 ord)",
  "mood": "positive|neutral|warning",
  "insights": ["Innsikt 1", "Innsikt 2"],
  "recommendation": "Ett konkret tips for dagen",
  "readinessScore": 7
}`;
}

// ==========================================
// 5. STRAVA TOKEN EXCHANGE
// ==========================================
exports.exchangeStravaToken = onCall({
    timeoutSeconds: 30,
    secrets: ["STRAVA_CLIENT_SECRET"],
    cors: true
}, async (request) => {
    const { code, userId } = request.data;

    if (!code) throw new HttpsError('invalid-argument', 'Authorization code is required');
    if (!userId) throw new HttpsError('invalid-argument', 'User ID is required');

    const clientId = process.env.STRAVA_CLIENT_ID || '198335';
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientSecret) {
        console.error('STRAVA_CLIENT_SECRET not configured');
        throw new HttpsError('failed-precondition', 'Strava client secret not configured');
    }

    console.log('Exchanging Strava code for token...', { userId, codePrefix: code.substring(0, 10) });

    try {
        // Exchange code for token
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Strava token exchange failed:', response.status, errorText);
            throw new HttpsError('internal', `Strava error: ${response.status}`);
        }

        const tokenData = await response.json();
        console.log('Strava token received for athlete:', tokenData.athlete?.id);

        // Store tokens in Firestore
        const db = admin.firestore();
        await db.collection('users').doc(userId).set({
            stravaTokens: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: tokenData.expires_at,
                athlete_id: tokenData.athlete?.id
            },
            stravaConnectedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('Strava tokens stored for user:', userId);

        return {
            success: true,
            athlete: tokenData.athlete
        };

    } catch (error) {
        if (error.code) throw error; // Re-throw HttpsError
        console.error('Strava token exchange error:', error);
        throw new HttpsError('internal', error.message || 'Failed to exchange Strava token');
    }
});

// ==========================================
// 6. STRAVA TOKEN REFRESH
// ==========================================
exports.refreshStravaToken = onCall({
    timeoutSeconds: 30,
    secrets: ["STRAVA_CLIENT_SECRET"],
    cors: true
}, async (request) => {
    const { userId } = request.data;

    if (!userId) throw new HttpsError('invalid-argument', 'User ID is required');

    const clientId = process.env.STRAVA_CLIENT_ID || '198335';
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientSecret) {
        throw new HttpsError('failed-precondition', 'Strava client secret not configured');
    }

    try {
        // Get current refresh token from Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();
        const refreshToken = userData.stravaTokens?.refresh_token;

        if (!refreshToken) {
            throw new HttpsError('failed-precondition', 'No Strava refresh token found');
        }

        // Refresh the token
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Strava token refresh failed:', response.status, errorText);
            throw new HttpsError('internal', `Strava refresh error: ${response.status}`);
        }

        const tokenData = await response.json();

        // Update tokens in Firestore
        await db.collection('users').doc(userId).update({
            'stravaTokens.access_token': tokenData.access_token,
            'stravaTokens.refresh_token': tokenData.refresh_token,
            'stravaTokens.expires_at': tokenData.expires_at
        });

        console.log('Strava tokens refreshed for user:', userId);

        return {
            access_token: tokenData.access_token,
            expires_at: tokenData.expires_at
        };

    } catch (error) {
        if (error.code) throw error;
        console.error('Strava token refresh error:', error);
        throw new HttpsError('internal', error.message || 'Failed to refresh Strava token');
    }
});

// ==========================================
// WHOOP INTEGRATION
// ==========================================
const whoopAuth = require('./whoop/auth');
const whoopProxy = require('./whoop/proxy');
const whoopSync = require('./whoop/sync');

exports.getWhoopAuthUrl = whoopAuth.getWhoopAuthUrl;
exports.exchangeWhoopToken = whoopAuth.exchangeWhoopToken;
exports.fetchWhoopData = whoopProxy.fetchWhoopData;
exports.syncWhoopMetrics = whoopSync.syncWhoopMetrics;
exports.getLatestWhoopMetrics = whoopSync.getLatestWhoopMetrics;
exports.getMetricsHistory = whoopSync.getMetricsHistory;

// ==========================================
// TRAINING ALGORITHM ENGINE
// ==========================================
const trainingLogic = require('./training/trainingLogic');
const adaptiveEngine = require('./training/adaptiveEngine');

// ==========================================
// ANALYTICS & PERFORMANCE TRACKING (FASE 1)
// ==========================================
const { PerformanceAnalytics } = require('./analytics/performanceAnalytics');
const { RecoveryPatternLearning } = require('./analytics/recoveryPatterns');
const { WorkoutResponseTracker } = require('./analytics/workoutResponse');

// ==========================================
// ADAPTIVE PERIODIZATION & LOAD MANAGEMENT (FASE 2)
// ==========================================
const { AdaptivePeriodization } = require('./training/adaptivePeriodization');
const { LoadManagement } = require('./training/loadManagement');

// ==========================================
// MACHINE LEARNING MODELS (FASE 3)
// ==========================================
const { PerformancePredictor } = require('./ml/performancePredictor');
const { WorkoutRecommender } = require('./ml/workoutRecommender');

/**
 * Generate a periodized training plan using the algorithm.
 * This is an alternative to the AI-based generatePlan.
 */
exports.generateAlgorithmicPlan = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { goal, preferences } = request.data;
    const userId = request.auth.uid;

    if (!goal || !goal.total_weeks) {
        throw new HttpsError('invalid-argument', 'Goal with total_weeks is required.');
    }

    try {
        // Generate the full plan using the algorithm
        const plan = trainingLogic.generateFullPlan(goal, preferences);

        // Store in Firestore
        const db = admin.firestore();
        const planRef = db.collection('users').doc(userId).collection('plans').doc(plan.planId);

        await planRef.set({
            ...plan,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            generatedBy: 'algorithm',
            isActive: true
        });

        // Mark as active plan in user profile
        await db.collection('users').doc(userId).set({
            activePlanId: plan.planId,
            activeGoal: {
                raceName: goal.race_name,
                raceDate: goal.race_date,
                raceDistKm: goal.race_dist_km,
                totalWeeks: goal.total_weeks
            }
        }, { merge: true });

        return plan;

    } catch (error) {
        console.error('Algorithm plan generation error:', error);
        throw new HttpsError('internal', error.message || 'Failed to generate plan.');
    }
});

/**
 * Adjust today's workout based on Whoop recovery data.
 */
exports.adjustTodaysWorkout = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;
    const db = admin.firestore();

    try {
        // 1. Get latest Whoop metrics
        const metricsRef = db.collection('users').doc(userId).collection('metrics');
        const metricsSnap = await metricsRef.orderBy('date', 'desc').limit(1).get();

        if (metricsSnap.empty) {
            return { adjusted: false, reason: 'No Whoop data available.' };
        }

        const latestMetrics = metricsSnap.docs[0].data();

        // 2. Get user's HRV baseline
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const hrvBaseline = userData?.profile?.hrv_baseline || 50;

        // 3. Get today's planned workout from active plan
        const activePlanId = userData?.activePlanId;
        if (!activePlanId) {
            return { adjusted: false, reason: 'No active plan.' };
        }

        const planDoc = await db.collection('users').doc(userId)
            .collection('plans').doc(activePlanId).get();

        if (!planDoc.exists) {
            return { adjusted: false, reason: 'Active plan not found.' };
        }

        const plan = planDoc.data();

        // Find today's workout
        const today = new Date().toISOString().split('T')[0];
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];

        // Find current week
        let todaysWorkout = null;
        let currentWeek = null;
        for (const week of plan.weeks || []) {
            const weekStart = new Date(week.weekStartDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            if (new Date(today) >= weekStart && new Date(today) <= weekEnd) {
                currentWeek = week;
                todaysWorkout = week.sessions?.find(s => s.day === dayOfWeek);
                break;
            }
        }

        if (!todaysWorkout) {
            return { adjusted: false, reason: 'No workout planned for today.' };
        }

        // 4. Analyze and adjust
        const whoopData = {
            recoveryScore: latestMetrics.recovery_score || 50,
            hrv: latestMetrics.hrv || hrvBaseline,
            restingHr: latestMetrics.resting_hr || 55,
            sleepPerformance: latestMetrics.sleep_performance || 75,
            strain: latestMetrics.strain || 0
        };

        const recommendation = adaptiveEngine.generateDailyRecommendation({
            whoopData,
            hrvBaseline,
            todaysWorkout,
            recentWorkouts: [], // Could fetch from workouts collection
            currentPhase: currentWeek?.phase || 'base'
        });

        return {
            adjusted: recommendation.shouldAdjust,
            originalWorkout: todaysWorkout,
            adjustedWorkout: recommendation.adjustedWorkout,
            recovery: recommendation.recovery,
            recommendation: recommendation.overallRecommendation,
            phase: currentWeek?.phase
        };

    } catch (error) {
        console.error('Adjust workout error:', error);
        throw new HttpsError('internal', error.message || 'Failed to adjust workout.');
    }
});

/**
 * ==================================================
 * ANALYTICS & PERFORMANCE INSIGHTS (FASE 1)
 * ==================================================
 */

/**
 * Get athlete's performance analytics
 */
exports.getPerformanceAnalytics = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;

    try {
        const analytics = new PerformanceAnalytics(userId);

        // Get current VDOT and fitness predictions
        const currentVDOT = await analytics.getCurrentVDOT();
        const fitnessPrediction = await analytics.predictFitness(16); // 16 week projection
        const tsb = await analytics.calculateTSB();
        const monotony = await analytics.calculateMonotony();

        return {
            currentVDOT,
            fitnessPrediction,
            trainingStressBalance: tsb,
            monotony,
            experienceLevel: await analytics.assessExperienceLevel()
        };
    } catch (error) {
        console.error('Performance analytics error:', error);
        throw new HttpsError('internal', error.message || 'Failed to get analytics.');
    }
});

/**
 * Get personalized recovery pattern and recommendations
 */
exports.getRecoveryInsights = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;

    try {
        const recovery = new RecoveryPatternLearning(userId);

        const pattern = await recovery.learnRecoveryPattern();
        const tomorrowPrediction = await recovery.predictTomorrowReadiness();
        const trend = await recovery.analyzeRecoveryTrend(7);
        const recommendation = await recovery.getRecoveryRecommendation();

        // Save pattern to user profile
        if (pattern.status === 'LEARNED') {
            await recovery.saveRecoveryPattern();
        }

        return {
            pattern,
            tomorrowPrediction,
            trend,
            recommendation
        };
    } catch (error) {
        console.error('Recovery insights error:', error);
        throw new HttpsError('internal', error.message || 'Failed to get recovery insights.');
    }
});

/**
 * Get workout adherence and effectiveness analysis
 */
exports.getWorkoutInsights = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;

    try {
        const tracker = new WorkoutResponseTracker(userId);

        const adherence = await tracker.analyzeAdherence();
        const effectiveness = await tracker.measureWorkoutEffectiveness();
        const frequency = await tracker.calculateOptimalFrequency();

        // Save to user profile
        await tracker.saveAdherenceProfile();

        return {
            adherence,
            effectiveness,
            optimalFrequency: frequency
        };
    } catch (error) {
        console.error('Workout insights error:', error);
        throw new HttpsError('internal', error.message || 'Failed to get workout insights.');
    }
});

/**
 * Calculate VDOT from race performance
 */
exports.calculateVDOT = onCall({
    timeoutSeconds: 10,
    cors: true
}, async (request) => {
    const { distanceKm, timeSeconds } = request.data;

    if (!distanceKm || !timeSeconds) {
        throw new HttpsError('invalid-argument', 'Distance and time are required.');
    }

    try {
        const analytics = new PerformanceAnalytics('temp');
        const vdot = analytics.calculateVDOT(distanceKm, timeSeconds);

        // Also provide race time predictions for this VDOT
        const predictions = {
            '5K': analytics.vdotToRaceTime(vdot, 5),
            '10K': analytics.vdotToRaceTime(vdot, 10),
            'Half Marathon': analytics.vdotToRaceTime(vdot, 21.1),
            'Marathon': analytics.vdotToRaceTime(vdot, 42.2)
        };

        return {
            vdot: Math.round(vdot * 10) / 10, // Round to 1 decimal
            predictions
        };
    } catch (error) {
        console.error('VDOT calculation error:', error);
        throw new HttpsError('internal', error.message || 'Failed to calculate VDOT.');
    }
});

/**
 * ==================================================
 * ADAPTIVE PERIODIZATION & LOAD MANAGEMENT (FASE 2)
 * ==================================================
 */

/**
 * Generate optimal phase distribution for training plan
 */
exports.calculateOptimalPhases = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { totalWeeks, raceDistance, userData } = request.data;

    if (!totalWeeks || !raceDistance) {
        throw new HttpsError('invalid-argument', 'Total weeks and race distance are required.');
    }

    try {
        const userId = request.auth.uid;
        const analytics = new PerformanceAnalytics(userId);
        const periodization = new AdaptivePeriodization(
            { ...userData, uid: userId },
            analytics
        );

        const phases = await periodization.calculateOptimalPhases(totalWeeks, raceDistance);

        return phases;
    } catch (error) {
        console.error('Calculate optimal phases error:', error);
        throw new HttpsError('internal', error.message || 'Failed to calculate phases.');
    }
});

/**
 * Generate complete periodization schedule
 */
exports.generatePeriodizationSchedule = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { totalWeeks, raceDistance, baseVolume, userData } = request.data;

    if (!totalWeeks || !raceDistance || !baseVolume) {
        throw new HttpsError('invalid-argument', 'Total weeks, race distance, and base volume are required.');
    }

    try {
        const userId = request.auth.uid;
        const analytics = new PerformanceAnalytics(userId);
        const recovery = new RecoveryPatternLearning(userId);

        // Get recovery speed for micro-cycle generation
        const recoveryPattern = await recovery.learnRecoveryPattern();
        const recoverySpeed = recoveryPattern.recoverySpeed || 'average';

        const periodization = new AdaptivePeriodization(
            { ...userData, uid: userId },
            analytics
        );

        const schedule = await periodization.generatePeriodizationSchedule(
            totalWeeks,
            raceDistance,
            baseVolume,
            recoverySpeed
        );

        return schedule;
    } catch (error) {
        console.error('Generate periodization schedule error:', error);
        throw new HttpsError('internal', error.message || 'Failed to generate schedule.');
    }
});

/**
 * Assess injury risk based on training load and recovery
 */
exports.assessInjuryRisk = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;

    try {
        const analytics = new PerformanceAnalytics(userId);
        const recovery = new RecoveryPatternLearning(userId);
        const loadManager = new LoadManagement(analytics, recovery);

        const injuryRisk = await loadManager.assessInjuryRisk();

        return injuryRisk;
    } catch (error) {
        console.error('Assess injury risk error:', error);
        throw new HttpsError('internal', error.message || 'Failed to assess injury risk.');
    }
});

/**
 * Calculate next week's recommended load
 */
exports.calculateNextWeekLoad = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { currentLoad, phase } = request.data;

    if (!currentLoad || !phase) {
        throw new HttpsError('invalid-argument', 'Current load and phase are required.');
    }

    try {
        const userId = request.auth.uid;
        const analytics = new PerformanceAnalytics(userId);
        const recovery = new RecoveryPatternLearning(userId);

        // Get recovery trend
        const recoveryTrend = await recovery.analyzeRecoveryTrend(7);

        const loadManager = new LoadManagement(analytics, recovery);
        const nextLoad = loadManager.calculateNextWeekLoad(
            currentLoad,
            phase,
            recoveryTrend.trend.toLowerCase()
        );

        return nextLoad;
    } catch (error) {
        console.error('Calculate next week load error:', error);
        throw new HttpsError('internal', error.message || 'Failed to calculate next week load.');
    }
});

/**
 * Schedule optimal recovery weeks
 */
exports.scheduleRecoveryWeeks = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { upcomingWeeks } = request.data;

    if (!upcomingWeeks) {
        throw new HttpsError('invalid-argument', 'Upcoming weeks parameter is required.');
    }

    try {
        const userId = request.auth.uid;
        const analytics = new PerformanceAnalytics(userId);
        const recovery = new RecoveryPatternLearning(userId);
        const loadManager = new LoadManagement(analytics, recovery);

        const recoverySchedule = await loadManager.scheduleRecoveryDays(upcomingWeeks);

        return {
            recoveryWeeks: recoverySchedule,
            totalWeeks: upcomingWeeks
        };
    } catch (error) {
        console.error('Schedule recovery weeks error:', error);
        throw new HttpsError('internal', error.message || 'Failed to schedule recovery weeks.');
    }
});

/**
 * Validate weekly plan safety
 */
exports.validateWeeklyPlanSafety = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { plannedWeek } = request.data;

    if (!plannedWeek || !plannedWeek.sessions) {
        throw new HttpsError('invalid-argument', 'Planned week with sessions is required.');
    }

    try {
        const userId = request.auth.uid;
        const analytics = new PerformanceAnalytics(userId);
        const recovery = new RecoveryPatternLearning(userId);
        const loadManager = new LoadManagement(analytics, recovery);

        const validation = await loadManager.validateWeeklyPlanSafety(plannedWeek);

        return validation;
    } catch (error) {
        console.error('Validate weekly plan safety error:', error);
        throw new HttpsError('internal', error.message || 'Failed to validate plan safety.');
    }
});

/**
 * ==================================================
 * MACHINE LEARNING PREDICTIONS (FASE 3)
 * ==================================================
 */

/**
 * Predict race day performance
 */
exports.predictRacePerformance = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { raceDate, raceDistance } = request.data;

    if (!raceDate || !raceDistance) {
        throw new HttpsError('invalid-argument', 'Race date and distance are required.');
    }

    try {
        const userId = request.auth.uid;
        const predictor = new PerformancePredictor(userId);

        const raceDateObj = new Date(raceDate);
        const prediction = await predictor.predictRaceDayPerformance(raceDateObj, raceDistance);

        return prediction;
    } catch (error) {
        console.error('Predict race performance error:', error);
        throw new HttpsError('internal', error.message || 'Failed to predict performance.');
    }
});

/**
 * Get predictions for multiple race distances
 */
exports.getPredictions = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { targetDate } = request.data;

    try {
        const userId = request.auth.uid;
        const predictor = new PerformancePredictor(userId);

        const targetDateObj = targetDate ? new Date(targetDate) : null;
        const predictions = await predictor.getPredictions(targetDateObj);

        return predictions;
    } catch (error) {
        console.error('Get predictions error:', error);
        throw new HttpsError('internal', error.message || 'Failed to get predictions.');
    }
});

/**
 * Train performance prediction model
 */
exports.trainPredictionModel = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    try {
        const userId = request.auth.uid;
        const predictor = new PerformancePredictor(userId);

        const model = await predictor.trainModel();

        return model;
    } catch (error) {
        console.error('Train prediction model error:', error);
        throw new HttpsError('internal', error.message || 'Failed to train model.');
    }
});

/**
 * Recommend next workout
 */
exports.recommendNextWorkout = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { context } = request.data;

    if (!context || !context.phase) {
        throw new HttpsError('invalid-argument', 'Context with phase is required.');
    }

    try {
        const userId = request.auth.uid;
        const recommender = new WorkoutRecommender(userId);

        const recommendation = await recommender.recommendNextWorkout(context);

        return recommendation;
    } catch (error) {
        console.error('Recommend next workout error:', error);
        throw new HttpsError('internal', error.message || 'Failed to recommend workout.');
    }
});

/**
 * Recommend weekly workout plan
 */
exports.recommendWeeklyPlan = onCall({
    timeoutSeconds: 30,
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { context } = request.data;

    if (!context || !context.phase || !context.availableDays) {
        throw new HttpsError('invalid-argument', 'Context with phase and available days is required.');
    }

    try {
        const userId = request.auth.uid;
        const recommender = new WorkoutRecommender(userId);

        const weeklyPlan = await recommender.recommendWeeklyPlan(context);

        return weeklyPlan;
    } catch (error) {
        console.error('Recommend weekly plan error:', error);
        throw new HttpsError('internal', error.message || 'Failed to recommend weekly plan.');
    }
});

/**
 * ==================================================
 * NUTRITION & LIFESTYLE FEATURES
 * ==================================================
 */
const nutrition = require('./nutrition');
exports.generateMealPlan = nutrition.generateMealPlan;
exports.generateRecipeFromIngredients = nutrition.generateRecipeFromIngredients;
