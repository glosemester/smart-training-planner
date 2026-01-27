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
            ? "Du er en ekspert på treningsplanlegging. Gi korte, presise analyser og forslag."
            : TRAINING_SYSTEM_PROMPT;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt + " Du er en JSON-generator. Svar KUN med rå JSON. Ingen tekst før eller etter. Bruk dobbelanførselstegn for alle strenger."
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

    // System Prompt construction
    let systemPrompt = `Du er en JSON-generator. Svar KUN med rå JSON. Ingen tekst, forklaringer eller markdown-formatering.
Du er en vennlig og kunnskapsrik personlig treningscoach som spesialiserer deg på løping, Hyrox og funksjonell fitness.

Du er en holistisk coach. Du har tilgang til både treningsdata og ernæringsdata via userContext. Se etter sammenhenger (f.eks. om lavt energinivå skyldes for lite karbohydrater før lange løpeturer) og gi råd som dekker begge områder.

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
Når brukeren ber om å endre treningsplanen (f.eks. "flytt økten til i morgen", "legg til en intervalløkt", "reduser belastningen"), bruk tilgjengelige funksjoner for å foreslå endringer. Forklar alltid HVORFOR du foreslår endringen, og be om bekreftelse før den utføres.

**OUTPUT FORMAT:**
Du skal returnere JSON format. Bruk et felt "message" for svaret ditt til brukeren.`;

    if (userContext) {
        systemPrompt += `\n\n**HOLISTISK BRUKERKONTEKST:**\n${JSON.stringify(userContext, null, 2)}`;
    }

    try {
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
        const lastMessage = messages[messages.length - 1].content;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt + " Du er en JSON-generator. Svar KUN med rå JSON. Ingen tekst før eller etter. Bruk dobbelanførselstegn for alle strenger."
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        let text = response.text();

        // Finn starten og slutten på JSON-objektet
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            console.error("Ingen JSON funnet i AI-svar", { raw: text });
            throw new HttpsError('internal', "AI-en svarte ikke i JSON-format.");
        }

        let jsonString = text.substring(start, end + 1);

        // 2. KRITISK RENSING: Fjern kontrolltegn og ulovlige linjeskift
        // Dette fjerner linjeskift inne i tekstfelt som ofte knekker JSON.parse
        jsonString = jsonString
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Fjerner ikke-printbare tegn
            //.replace(/\n/g, "\\n")  // Bevarer linjeskift som kodesekvenser - disabled as it might double escape if AI is correct
            .replace(/\r/g, "\\r");

        try {
            // Prøv å parse den rensede strengen
            const parsed = JSON.parse(jsonString);
            return parsed;
        } catch (e) {
            console.error("JSON parse feilet etter rensing", {
                error: e.message,
                processedText: jsonString.substring(0, 100) + "..."
            });

            // Fallback: Hvis den fortsatt feiler, prøv en super-enkel rensing
            try {
                const superCleaned = text.substring(start, end + 1).replace(/\s+/g, " ");
                return JSON.parse(superCleaned);
            } catch (e2) {
                throw new HttpsError('internal', "AI-formatet var ugyldig. Vennligst prøv igjen.");
            }
        }
    } catch (error) {
        if (error.code === 'internal') throw error;
        return formatGeminiError(error);
    }
});

// ==========================================
// 3. ANALYZE NUTRITION
// ==========================================
exports.analyzeNutrition = onCall({
    timeoutSeconds: 60,
    secrets: ["GEMINI_API_KEY"],
    cors: true
}, async (request) => {
    const { description, mealType } = request.data;
    const apiKey = getGeminiKey();
    if (!apiKey) throw new HttpsError('failed-precondition', 'API Key missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `Du er en JSON-generator. Svar KUN med rå JSON. Ingen tekst, forklaringer eller markdown-formatering. Du er en ekspert på mat og ernæring... Returner JSON. Svar KUN med rå JSON. Ingen tekst før eller etter. Bruk dobbelanførselstegn for alle strenger.`
    });

    const prompt = `Analyser dette måltidet: "${description}". ${mealType ? `Måltidstype: ${mealType}` : ''}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Finn starten og slutten på JSON-objektet
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            console.error("Ingen JSON funnet i AI-svar", { raw: text });
            throw new HttpsError('internal', "AI-en svarte ikke i JSON-format.");
        }

        let jsonString = text.substring(start, end + 1);

        // 2. KRITISK RENSING: Fjern kontrolltegn og ulovlige linjeskift
        // Dette fjerner linjeskift inne i tekstfelt som ofte knekker JSON.parse
        jsonString = jsonString
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Fjerner ikke-printbare tegn
            //.replace(/\n/g, "\\n")  // Bevarer linjeskift som kodesekvenser - disabled as it might double escape if AI is correct
            .replace(/\r/g, "\\r");

        try {
            // Prøv å parse den rensede strengen
            const parsed = JSON.parse(jsonString);
            return parsed;
        } catch (e) {
            console.error("JSON parse feilet etter rensing", {
                error: e.message,
                processedText: jsonString.substring(0, 100) + "..."
            });

            // Fallback: Hvis den fortsatt feiler, prøv en super-enkel rensing
            try {
                const superCleaned = text.substring(start, end + 1).replace(/\s+/g, " ");
                return JSON.parse(superCleaned);
            } catch (e2) {
                throw new HttpsError('internal', "AI-formatet var ugyldig. Vennligst prøv igjen.");
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
        systemInstruction: "Du er en JSON-generator. Svar KUN med rå JSON. Ingen tekst, forklaringer eller markdown-formatering. Du er en personlig treningscoach som gir korte, motiverende daglige oppsummeringer. Svar KUN med rå JSON. Ingen tekst før eller etter. Bruk dobbelanførselstegn for alle strenger."
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
        if (error.code === 'internal') throw error;
        return formatGeminiError(error);
    }
});

// ==========================================
// HELPERS
// ==========================================
function buildUserPrompt(userData, chunkInfo) {
    const { goal = {}, planType } = userData;

    let goalInfo = "";
    if (goal.type === 'race') {
        goalInfo = `Mål: Race ${goal.distance} dato ${goal.date}`;
    } else {
        goalInfo = `Mål: ${goal.type}`;
    }

    let chunkPrompt = "";
    if (chunkInfo) {
        if (chunkInfo.isFirstChunk) {
            chunkPrompt = `Lag overordnet strategi og detaljer for uke ${chunkInfo.startWeek}-${chunkInfo.startWeek + chunkInfo.weeksPerChunk - 1}.`;
        } else {
            chunkPrompt = `Lag detaljer for uke ${chunkInfo.startWeek}-${chunkInfo.startWeek + chunkInfo.weeksPerChunk - 1} basert på strategi: ${chunkInfo.overallStrategy}`;
        }
    }

    return `Generer treningsplan. \n${goalInfo}\n${chunkPrompt}\nBrukerdata: ${JSON.stringify(userData)}`;
}

function buildSummaryPrompt(data) {
    return `Analyser og oppsummer: ${JSON.stringify(data)}`;
}
