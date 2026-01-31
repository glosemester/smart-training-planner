const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors')({ origin: true });

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

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            // Siste utvei hvis parsing feiler: Super-rens
            try {
                const fallbackClean = text.substring(start, end + 1).replace(/\s+/g, " ");
                return JSON.parse(fallbackClean);
            } catch (e2) {
                console.error("Kritisk JSON-feil", { raw: text });
                throw new HttpsError('internal', "AI-formatet var ugyldig. Vennligst prøv igjen.");
            }
        }

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
    const { goal = {}, planType, stravaHistory } = userData;

    let goalInfo = "";
    if (goal.type === 'race') {
        goalInfo = `Mål: Race ${goal.distance} dato ${goal.date}`;
    } else {
        goalInfo = `Mål: ${goal.type}`;
    }

    let chunkPrompt = "";
    let weekRange = "";
    if (chunkInfo) {
        const endWeek = chunkInfo.startWeek + chunkInfo.weeksPerChunk - 1;
        weekRange = `uke ${chunkInfo.startWeek}-${endWeek}`;
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
STRAVA-HISTORIKK (siste 4 uker - BRUK DETTE SOM UTGANGSPUNKT):
- Ukentlig gjennomsnitt: ${stravaHistory.weeklyAvgKm} km
- Lengste løp: ${stravaHistory.longestRun} km
- Gjennomsnittspacing: ${stravaHistory.avgPace || 'ukjent'}/km
- Konsistens: ${stravaHistory.consistency}%
- Trend: ${stravaHistory.trend}

VIKTIG: Start planen på et nivå som matcher denne historikken!
- Første uke bør ha omtrent ${stravaHistory.weeklyAvgKm} km totalt
- Long run bør starte på maks ${Math.round(stravaHistory.longestRun * 1.1)} km
- Øk volumet gradvis (maks 10% per uke)`;
    }

    // Beregn antall uker for JSON-strukturen
    const weeksToGenerate = chunkInfo ? chunkInfo.weeksPerChunk : (userData.planDuration || 4);

    return `VIKTIG: Svar KUN med JSON. Ingen tekst før eller etter JSON-objektet. Start svaret med { og avslutt med }.

${goalInfo}
${chunkPrompt}
${stravaContext}

BRUKERDATA:
${JSON.stringify(userData, null, 2)}

SVAR MED DENNE EKSAKTE JSON-STRUKTUREN (${weeksToGenerate} uker):
{
  "planDuration": ${weeksToGenerate},
  "goalInfo": "kort oppsummering av mål",
  "overallStrategy": "overordnet strategi for perioden",
  "milestones": ["milepæl 1", "milepæl 2"],
  "weeks": [
    {
      "weekNumber": 1,
      "weekStartDate": "2025-01-27",
      "phase": "base|build|peak|taper",
      "focus": "ukens fokus",
      "totalLoad": {
        "running_km": 30,
        "strength_sessions": 2,
        "estimated_hours": 6
      },
      "sessions": [
        {
          "day": "monday",
          "type": "easy_run|tempo|interval|long_run|hyrox|crossfit|strength|rest|recovery",
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

HUSK: Start svaret med { og avslutt med }. Ingen annen tekst.`;
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
