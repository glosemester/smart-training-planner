# Smart Training Planner - Utviklingsinstruksjoner for Claude Code

## Prosjektoversikt

**Navn:** Smart Training Planner  
**Type:** Progressive Web App (PWA)  
**Utvikler:** Øyvind (ikke-programmerer, kan GitHub, Netlify, Firebase)  
**Hovedfokus:** Løping med støtte for Hyrox/CrossFit  
**AI-integrasjon:** Anthropic Claude API for treningsgenerering

---

## Teknisk Stack

### Frontend
- **React 18** med Vite som build-tool
- **Tailwind CSS** for styling
- **PWA** med service worker og manifest
- **Recharts** for treningsstatistikk og visualisering

### Backend/Infrastruktur
- **Firebase Authentication** (Google-innlogging, begrenset til én bruker)
- **Firebase Firestore** for datalagring
- **Firebase Storage** for bildeopplasting
- **Netlify** for hosting

### Integrasjoner
- **Anthropic Claude API** for AI-generert treningsplan
- **Apple HealthKit** via Web API (begrenset støtte, må bruke eksport/import)
- **Google Fit API** for helsedata

---

## Mappestruktur

```
smart-training-planner/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── icons/                 # App-ikoner (192x192, 512x512)
│   └── index.html
├── src/
│   ├── main.jsx               # App entry point
│   ├── App.jsx                # Hovedkomponent med routing
│   ├── index.css              # Global CSS med Tailwind
│   │
│   ├── config/
│   │   ├── firebase.js        # Firebase-konfigurasjon
│   │   └── anthropic.js       # Anthropic API-oppsett
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Autentiseringskontekst
│   │   └── TrainingContext.jsx # Treningsdata-kontekst
│   │
│   ├── hooks/
│   │   ├── useAuth.js         # Auth-hook
│   │   ├── useWorkouts.js     # Treningsøkter-hook
│   │   ├── useHealthData.js   # Helsedata-hook
│   │   └── useAIPlan.js       # AI-generering hook
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Navigation.jsx
│   │   │   └── Layout.jsx
│   │   │
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── WeeklyOverview.jsx
│   │   │   ├── NextWorkout.jsx
│   │   │   └── ProgressChart.jsx
│   │   │
│   │   ├── workouts/
│   │   │   ├── WorkoutList.jsx
│   │   │   ├── WorkoutCard.jsx
│   │   │   ├── WorkoutDetail.jsx
│   │   │   ├── LogWorkout.jsx
│   │   │   └── ImageUpload.jsx
│   │   │
│   │   ├── planning/
│   │   │   ├── GoalSetting.jsx
│   │   │   ├── AIPlanner.jsx
│   │   │   ├── WeeklyPlan.jsx
│   │   │   └── PlanAdjustment.jsx
│   │   │
│   │   ├── health/
│   │   │   ├── HealthSync.jsx
│   │   │   ├── HealthMetrics.jsx
│   │   │   └── SleepRecovery.jsx
│   │   │
│   │   └── stats/
│   │       ├── Statistics.jsx
│   │       ├── RunningStats.jsx
│   │       ├── StrengthStats.jsx
│   │       └── TrendCharts.jsx
│   │
│   ├── services/
│   │   ├── workoutService.js   # Firestore CRUD for økter
│   │   ├── healthService.js    # Helsedata-integrasjon
│   │   ├── aiService.js        # Anthropic API-kall
│   │   └── storageService.js   # Firebase Storage
│   │
│   ├── utils/
│   │   ├── dateUtils.js        # Datohåndtering
│   │   ├── paceCalculator.js   # Løpstempo-kalkulasjoner
│   │   └── formatters.js       # Formattering av data
│   │
│   └── data/
│       ├── workoutTypes.js     # Treningstyper definisjon
│       └── zones.js            # Pulssoner definisjon
│
├── .env.example                # Miljøvariabler mal
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml
└── README.md
```

---

## Funksjonelle Krav

### 1. Autentisering (Høy Prioritet)
- Google-innlogging via Firebase Auth
- **KRITISK:** Begrens tilgang til kun én spesifikk e-postadresse
- Automatisk utlogging etter 30 dager inaktivitet
- Beskyttet routing - alle sider krever innlogging

```javascript
// Eksempel på e-postbegrensning i AuthContext
const ALLOWED_EMAIL = "oyvind@example.com"; // Bytt til faktisk e-post

const signIn = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user.email !== ALLOWED_EMAIL) {
    await signOut(auth);
    throw new Error("Ikke autorisert");
  }
};
```

### 2. Dashboard
- Oversikt over neste planlagte økt
- Ukentlig treningsbelastning (timer, km, økter)
- Forrige ukes sammendrag
- Progresjonsgraf (siste 4-12 uker)
- Recoveryindikator basert på søvn/HRV hvis tilgjengelig

### 3. Treningslogging
- **Løping:** Distanse, tid, tempo, pulssoner, opplevd anstrengelse (RPE 1-10)
- **Hyrox/CrossFit:** Øvelser, repetisjoner, vekt, tid, RX/scaled
- Bildeopplasting (maks 3 bilder per økt)
- Fritekst-notater
- Værinformasjon (manuell eller automatisk)
- Underlag (asfalt, sti, grus, tredemølle)

### 4. Mål og Planlegging
- Sett hovedmål (f.eks. "65km ultramarathon", "Hyrox PB")
- Delmål (ukentlig km, løpstempo, styrke)
- Tilgjengelige treningsdager per uke
- Preferanser for øktlengde og intensitet

### 5. AI Treningsplanlegger (Anthropic Claude)
- Generer ukentlig treningsplan basert på:
  - Mål (kort- og langsiktig)
  - Historiske treningsdata
  - Helsedata (søvn, HRV, hvilepuls)
  - Tilgjengelig tid
  - Progresjon og periodisering
- Fleksibel plan som kan justeres
- Forklaring på hvorfor hver økt er valgt
- Automatisk re-generering ved store avvik

### 6. Helsedata-integrasjon
- **Google Fit:** Skritteller, hvilepuls, søvn, treninger
- **Apple Health:** Eksport/import av XML-data (manuell)
- Vis trender for:
  - Hvilepuls over tid
  - Søvnkvalitet og varighet
  - Daglig aktivitetsnivå
  - HRV hvis tilgjengelig

### 7. Statistikk og Analyse
- Løping: Ukentlig km, gjennomsnittlig tempo, lengste løp
- Styrke: Volum, progresjon på øvelser
- Trender over 4, 8, 12 uker
- Sammenligning med tidligere perioder

---

## AI Prompt-struktur for Treningsgenerering

```javascript
// services/aiService.js

export const generateTrainingPlan = async (userData) => {
  const systemPrompt = `Du er en erfaren treningsplanlegger som spesialiserer seg på utholdenhetstrening 
og funksjonell fitness. Du lager treningsplaner for en person som trener løping (hovedfokus), 
Hyrox og CrossFit.

Viktige prinsipper:
- 80/20-regelen: 80% lav intensitet, 20% høy intensitet for løping
- Progressiv overbelastning: Maks 10% økning i ukentlig volum
- Periodisering: Bygg opp mot konkurranser med riktig tapering
- Recovery: Vurder søvn, stress og tidligere belastning
- Balanse: Kombiner løping med styrke uten overtrening

Output-format: Returner alltid en strukturert JSON med følgende format:
{
  "weekNumber": number,
  "focus": "string beskrivelse av ukens fokus",
  "totalLoad": { "running_km": number, "strength_sessions": number },
  "sessions": [
    {
      "day": "monday|tuesday|...",
      "type": "easy_run|interval|long_run|hyrox|crossfit|rest",
      "title": "string",
      "description": "string",
      "duration_minutes": number,
      "details": {}, // Type-spesifikke detaljer
      "rationale": "string forklaring på hvorfor denne økten"
    }
  ],
  "adjustmentTips": ["string tips for justering hvis nødvendig"]
}`;

  const userPrompt = `
Lag en treningsplan for kommende uke basert på følgende:

**Mål:**
${userData.goals.map(g => `- ${g}`).join('\n')}

**Tilgjengelige dager:** ${userData.availableDays.join(', ')}
**Maks tid per økt:** ${userData.maxSessionDuration} minutter

**Siste 4 ukers trening:**
${JSON.stringify(userData.recentWorkouts, null, 2)}

**Helsedata siste uke:**
- Gjennomsnittlig søvn: ${userData.health.avgSleep} timer
- Hvilepuls: ${userData.health.restingHR} bpm
- HRV: ${userData.health.hrv || 'Ikke tilgjengelig'}

**Notater/preferanser:**
${userData.notes || 'Ingen spesielle notater'}

Lag en balansert uke som bygger mot målene mine.
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }]
  });

  return JSON.parse(response.content[0].text);
};
```

---

## Firestore Datamodell

```javascript
// Samlinger (Collections)

// users/{userId}
{
  email: "string",
  displayName: "string",
  createdAt: timestamp,
  settings: {
    weekStartsOn: "monday",
    units: "metric",
    defaultActivityType: "running"
  },
  goals: {
    primary: "65km ultramarathon mai 2026",
    secondary: ["Hyrox PB", "Ned i 85kg"],
    weeklyTargets: {
      runningKm: 50,
      strengthSessions: 2
    }
  }
}

// users/{userId}/workouts/{workoutId}
{
  date: timestamp,
  type: "running|hyrox|crossfit|strength|other",
  title: "string",
  duration: number, // minutter
  
  // Løping-spesifikk
  running: {
    distance: number, // km
    avgPace: "string", // "5:30"
    avgHR: number,
    maxHR: number,
    elevation: number,
    surface: "road|trail|track|treadmill",
    weather: "string"
  },
  
  // Styrke-spesifikk
  strength: {
    exercises: [
      {
        name: "string",
        sets: number,
        reps: number,
        weight: number,
        notes: "string"
      }
    ]
  },
  
  rpe: number, // 1-10
  notes: "string",
  images: ["url1", "url2"],
  source: "manual|strava|garmin|apple_health|google_fit",
  
  // AI-metadata
  wasPlanned: boolean,
  plannedWorkoutId: "string|null",
  
  createdAt: timestamp,
  updatedAt: timestamp
}

// users/{userId}/plans/{planId}
{
  weekStart: timestamp,
  weekNumber: number,
  generatedAt: timestamp,
  generatedBy: "ai|manual",
  
  focus: "string",
  totalPlannedLoad: {
    runningKm: number,
    strengthSessions: number
  },
  
  sessions: [
    {
      day: "string",
      type: "string",
      title: "string",
      description: "string",
      duration: number,
      details: {},
      completed: boolean,
      actualWorkoutId: "string|null"
    }
  ],
  
  aiRationale: "string",
  adjustments: []
}

// users/{userId}/healthData/{date}
{
  date: timestamp,
  sleep: {
    duration: number, // timer
    quality: "poor|fair|good|excellent",
    deepSleep: number,
    remSleep: number
  },
  restingHR: number,
  hrv: number,
  steps: number,
  activeCalories: number,
  source: "google_fit|apple_health|manual"
}
```

---

## Utviklingsrekkefølge

### Fase 1: Grunnmur (Uke 1)
1. Sett opp Vite + React prosjekt
2. Konfigurer Tailwind CSS
3. Sett opp Firebase (Auth, Firestore, Storage)
4. Implementer Google-innlogging med e-postbegrensning
5. Lag grunnleggende Layout og Navigation
6. Sett opp PWA (manifest.json, service worker)

### Fase 2: Treningslogging (Uke 2)
1. Dashboard-skjelett
2. WorkoutList og WorkoutCard
3. LogWorkout-skjema for alle treningstyper
4. Bildeopplasting til Firebase Storage
5. CRUD-operasjoner mot Firestore

### Fase 3: AI-integrasjon (Uke 3)
1. Sett opp Anthropic API-tilkobling
2. GoalSetting-komponent
3. AIPlanner - send data, motta plan
4. WeeklyPlan-visning
5. Koble planlagte økter til faktiske økter

### Fase 4: Helsedata (Uke 4)
1. Google Fit API-integrasjon
2. Apple Health XML-import
3. HealthMetrics-dashboard
4. Koble helsedata til AI-planlegging

### Fase 5: Statistikk og Polish (Uke 5)
1. Statistikk-side med Recharts
2. Trendanalyse
3. UI-forbedringer
4. Testing og bugfiks
5. Deploy til Netlify

---

## Miljøvariabler (.env)

```env
# Firebase
VITE_FIREBASE_API_KEY=din-api-key
VITE_FIREBASE_AUTH_DOMAIN=ditt-prosjekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ditt-prosjekt
VITE_FIREBASE_STORAGE_BUCKET=ditt-prosjekt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-api...

# App
VITE_ALLOWED_EMAIL=din-email@gmail.com
```

**VIKTIG:** VITE_ANTHROPIC_API_KEY bør egentlig være på server-side. For en personlig app kan dette fungere, men vær klar over sikkerhetsimplikasjonene.

---

## Netlify Konfigurasjon

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Design-retningslinjer

### Estetikk
- **Tema:** Mørkt tema med energiske aksentfarger
- **Farger:** 
  - Bakgrunn: `#0f0f0f` til `#1a1a2e`
  - Primær: Energisk oransje `#ff6b35` (løping)
  - Sekundær: Kraftig blå `#4361ee` (styrke)
  - Suksess: `#06d6a0`
  - Tekst: `#f8f9fa` og `#adb5bd`
- **Font:** "Outfit" for headings, "Inter" for body (eller lignende moderne sans-serif)
- **Border-radius:** Avrundede hjørner (8-12px)
- **Shadows:** Subtile glows på aktive elementer

### Mobil-først
- Responsivt design, optimalisert for telefon
- Touch-vennlige knapper (min 44x44px)
- Swipe-gestures der naturlig
- Bottom navigation for hovedfunksjoner

---

## Ekstra Funksjoner (Nice-to-have)

1. **Strava-integrasjon** - Automatisk import av løpeøkter
2. **Garmin Connect-sync** - For mer detaljerte data
3. **Værvarsel** - Vis vær for planlagte utendørsøkter
4. **Sosial deling** - Del treningsmilepæler
5. **Eksport** - Eksporter treningshistorikk som CSV/PDF
6. **Mørk/lys modus** - Toggle mellom temaer
7. **Offline-støtte** - Full PWA med offline-logging
8. **Push-varsler** - Påminnelser om planlagte økter
9. **Treningssoner-kalkulator** - Basert på maxHR eller terskel
10. **Løpskalkulator** - Tempo, distanse, tid-beregninger

---

## Viktige Notater for Claude Code

1. **Bruk funksjonelle React-komponenter** med hooks, ikke klasser
2. **TypeScript er valgfritt** - kan starte med JavaScript for enkelhet
3. **Unngå over-engineering** - start enkelt, utvid etter behov
4. **Kommenter koden** på norsk eller engelsk
5. **Feilhåndtering** - alltid håndter loading, error og tomme states
6. **Responsivt** - test på mobil-viewport først
7. **Tilgjengelighet** - bruk semantisk HTML, aria-labels
8. **Git commits** - hyppige, beskrivende commits

---

## Kom i gang

```bash
# Opprett prosjekt
npm create vite@latest smart-training-planner -- --template react

# Installer avhengigheter
cd smart-training-planner
npm install firebase @anthropic-ai/sdk recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Start utviklingsserver
npm run dev
```

Lykke til med utviklingen! 🏃‍♂️💪
