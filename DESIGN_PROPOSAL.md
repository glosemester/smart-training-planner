# 🎨 Design & UX Vurdering - Smart Training Planner

## 📋 Nåværende Status

**App-navn**: Smart Training Planner (ST Training)
**Primær fokus**: Løpeplanlegging, Mat, Chat
**Fargepalett**: Orange primary (#ff6b35), Blå secondary (#4361ee), Mørk bakgrunn

---

## 🎯 FORSLAG 1: NYTT NAVN OG BRANDING

### Problem
- "Smart Training Planner" er generisk og for langt
- "ST Training" blir feil - står for samme ord to ganger
- Mangler personlighet og gjenkjennelighet

### Løsninger - Navneforslag:

#### **Anbefaling: "RunCoach"** ⭐
- **Kort, moderne, internasjonalt**
- Enkelt å huske og uttale
- Domene: runcoach.no / runcoach.app
- Fokuserer på hovedfunksjonen (løping + AI coaching)
- Profesjonelt, men tilgjengelig

#### Alternativer:
1. **"PaceAI"** - Moderne, tech-fokusert (pace + AI)
2. **"StrideHub"** - Community-feeling, løpefokus
3. **"FlowTrainer"** - Norsk/skandinavisk vibe
4. **"Tempo"** - Enkelt, clean, løping-assosiert
5. **"Kurant"** (norsk: "i fin form") - Lokalt, unikt

---

## 🏠 FORSLAG 2: FORBEDRET DASHBOARD

### Nåværende Dashboard
✅ **Fungerer bra:**
- Tydelig greeting
- Neste økt prominent
- Ukesstatistikk
- Siste økter

❌ **Mangler:**
- AI-oppsummering av dagen
- Ernæringsinfo
- Trenings vs. hvilebalanse
- Garmin-synkronisering status

### Ny Dashboard-struktur:

```
┌─────────────────────────────────────┐
│ 🌅 God morgen, [Navn]!              │
│ Fredag 21. januar                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✨ AI Dagens Oppsummering           │
│ ─────────────────────────────────── │
│ 📊 Siste Garmin-import: 23:45       │
│ 🏃 I går: 8.2 km rolig, RPE 6      │
│ 🍎 Energibalanse: -250 kcal        │
│ 💤 Søvn: 7.5t (Garmin)             │
│                                     │
│ 💡 Anbefaling:                      │
│ "Bra restitusjon! Du er klar for   │
│  dagens intervalltrening. Fokuser   │
│  på oppvarming og væskeinntak."    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎯 I dag: Intervalltrening         │
│ 10x400m @ Z4                        │
│ ⏱ 50 min • 📍 8.5 km               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📈 Denne uken                       │
│ ┌────────┬────────┬────────┬──────┐│
│ │ 24.5km │  4.2t  │ 5 økter│2 styr││
│ │ Løpt   │ Trent  │ Totalt │Styrke││
│ └────────┴────────┴────────┴──────┘│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🍎 Mat i dag                        │
│ ┌─────────────────────────────────┐ │
│ │ 1250 / 2800 kcal (45%)         │ │
│ │ ▓▓▓▓▓▓░░░░░░░░                 │ │
│ └─────────────────────────────────┘ │
│ P: 65g • K: 120g • F: 45g          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💬 Spør Coach                       │
│ "Hvordan skal jeg periodisere       │
│  før ultramaraton?"                 │
└─────────────────────────────────────┘
```

### Implementering:

1. **AI Daglig Oppsummering**
   - Ny Netlify function: `generate-daily-summary.js`
   - Input: Siste Garmin-økter, måltider, søvndata, treningsplan
   - Output: Personlig oppsummering + anbefaling
   - Caches i Firestore, genereres 1x per dag kl 06:00

2. **Garmin Status Widget**
   - Viser siste synkroniseringstidspunkt
   - Knapp for manuell synk
   - Import-status indikator

3. **Mat-widget på Dashboard**
   - Quick glance på dagens kaloriinntak
   - Progress bar
   - Link til full Mat-side

---

## 🔄 FORSLAG 3: GARMIN CONNECT INTEGRASJON

### Arkitektur:

```
User → App → Netlify Functions → Garmin Connect API → Firestore
```

### Funksjonalitet:

#### **Import av økter** (Prioritet 1)
- Automatisk import av løpeøkter fra Garmin
- Data: Distanse, tid, puls, tempo, høydemeter, GPS-track
- Frekvens: Hver natt kl 02:00 + manuell trigger
- Auto-kategorisering: easy_run, tempo, interval basert på puls/pace

#### **Eksport til Garmin** (Prioritet 2)
- Strukturerte workouts fra AI-planlegger
- Format: `.fit` filer
- Tempo-soner, distanser, intervaller
- Push direkte til Garmin Connect kalendar

#### **Søvn og Restitusjon** (Prioritet 3)
- Hent søvndata fra Garmin
- Body Battery / HRV hvis tilgjengelig
- Brukes i AI-anbefalinger

### Implementering:

**Filer å opprette:**
```
netlify/functions/
├── garmin-auth.js          # OAuth flow
├── garmin-import.js        # Import workouts
├── garmin-export.js        # Export .fit workouts
└── garmin-webhook.js       # Push notifications

src/services/
└── garminService.js        # Frontend API calls

src/components/health/
├── GarminConnect.jsx       # Connect/disconnect UI
└── GarminWorkoutImport.jsx # Manual import UI
```

---

## 🧭 FORSLAG 4: FORBEDRET NAVIGASJON

### Nåværende Navigasjon:
```
[Hjem] [Økter] [➕ Logg] [Mat] [Chat]
```

### Problem:
- AI Planner er gjemt (ingen navigasjonsknapp!)
- Statistikk er gjemt
- Helsesynk er gjemt

### Ny Navigasjon:

#### **Bottom Navigation** (mobil):
```
[🏠 Hjem] [📊 Plan] [➕ Logg] [🍎 Mat] [💬 Coach]
```

#### **Sidebar/Hamburger Menu**:
```
📈 Statistikk
⚙️ Innstillinger
❤️ Helse & Garmin
🎯 Mål
📚 Historikk (alle økter)
```

#### **Dashboard Quick Actions** (øverst):
```
[🔄 Synk Garmin] [💬 Spør Coach] [📊 Se Statistikk]
```

---

## 🎨 FORSLAG 5: VISUELL POLISH

### Fargepalett - Justeringer:

#### **Primærfarger** (beholdes):
- Primary: `#ff6b35` (Orange) - Løping, energi
- Secondary: `#4361ee` (Blå) - Planlegging, tech

#### **Nye aksentfarger**:
```css
/* Mat/ernæring */
nutrition: '#06d6a0'  // Grønn (helse, mat)

/* Coach/AI */
ai: '#a855f7'         // Lilla (AI, intelligens)

/* Hvile/recovery */
recovery: '#64748b'   // Grå-blå (ro, hvile)

/* Garmin sync */
garmin: '#00b0ff'     // Lyseblå (teknologi)
```

### Typografi - Forbedringer:

```css
/* Heading Hierarchy */
h1: 28px/32px, Outfit Bold      // Dashboard title
h2: 20px/24px, Outfit Semibold  // Section titles
h3: 16px/20px, Outfit Medium    // Card titles
body: 14px/20px, Inter Regular  // Body text
caption: 12px/16px, Inter Medium // Labels
```

### Card Design - Standardisering:

```jsx
// Base Card
<div className="card">
  {/* Padding: 16px */}
  {/* Border-radius: 16px */}
  {/* Background: bg-background-secondary */}
  {/* Border: border-white/5 */}
</div>

// Elevated Card (AI, viktig info)
<div className="card-elevated">
  {/* Shadow + gradient border */}
</div>

// Interactive Card (clickable)
<div className="card-interactive">
  {/* Hover state + transition */}
</div>
```

---

## 📱 FORSLAG 6: RESPONSIVE & MOBILE-FIRST

### Breakpoints:
```
sm:  640px  (Large phones)
md:  768px  (Tablets)
lg:  1024px (Desktop)
xl:  1280px (Large desktop)
```

### Layout-strategi:

#### **Mobile** (default):
- Single column
- Bottom navigation
- Stack all cards
- 16px padding

#### **Tablet** (md):
- 2-column grid for stats
- Sidebar navigation
- 24px padding

#### **Desktop** (lg):
- Max-width: 1200px centered
- 3-column grid for dashboard
- Persistent sidebar
- 32px padding

---

## 🚀 FORSLAG 7: PERFORMANCE & PWA

### Forbedringer:

1. **Lazy Loading** ✅ (allerede implementert)
2. **Image Optimization**:
   - Workout bilder: WebP format
   - Lazy load images below fold
   - Blurhash placeholders

3. **Offline Mode**:
   - Cache treningsplan lokalt
   - Queue workout logging
   - Sync når tilbake online

4. **Push Notifications**:
   - Påminnelse om dagens trening (kl 17:00)
   - Garmin import ferdig
   - Ukentlig oppsummering (søndag kveld)

---

## 📊 FORSLAG 8: AI OPPSUMMERING - TEKNISK SPEC

### Endpoint: `generate-daily-summary.js`

**Input:**
```json
{
  "userId": "user123",
  "date": "2024-01-21",
  "data": {
    "lastWorkout": {...},
    "todaysNutrition": {...},
    "sleepData": {...},
    "garminBodyBattery": 85,
    "todaysPlannedWorkout": {...},
    "weekProgress": {...}
  }
}
```

**Output:**
```json
{
  "summary": {
    "mood": "positive|neutral|warning",
    "headline": "Bra restitusjon - klar for intervaller!",
    "insights": [
      "Siste økt: 8.2 km rolig, god form",
      "Energibalanse: -250 kcal (bra)",
      "Søvn: 7.5t (godt)"
    ],
    "recommendation": "Fokuser på oppvarming...",
    "warnings": ["Mulig underfueling..."],
    "stats": {
      "lastGarminSync": "2024-01-21T23:45:00Z",
      "weeklyProgress": "4/5 økter fullført"
    }
  }
}
```

**AI Prompt (OpenAI GPT-4o mini for kostnad):**
```
Du er en personlig treningscoach. Analyser dagens trenings- og ernæringsdata,
og gi en kort, motiverende oppsummering med konkrete anbefalinger.

Vurder:
- Treningsbelastning siste dager
- Ernæring vs. treningsvolum
- Søvnkvalitet
- Dagens planlagte økt

Svar i JSON-format på norsk.
```

---

## 🎯 PRIORITERT IMPLEMENTERINGSPLAN

### **FASE 1: Foundation** (Uke 1-2)
- [ ] Nytt navn og branding
- [ ] Forbedret Dashboard med AI-oppsummering
- [ ] Garmin Connect OAuth setup
- [ ] Import av Garmin-økter (basis)

### **FASE 2: Core Features** (Uke 3-4)
- [ ] Mat-widget på Dashboard
- [ ] Forbedret navigasjon
- [ ] Garmin eksport av workouts (.fit)
- [ ] Push notifications

### **FASE 3: Polish** (Uke 5-6)
- [ ] Visuell refresh (farger, typografi)
- [ ] Responsive forbedringer
- [ ] Performance optimization
- [ ] Testing & bugfixes

---

## 💡 KONKRETE DESIGNENDRINGER

### 1. **Rename App**
```diff
- index.html: "Smart Training Planner"
+ index.html: "RunCoach"

- Navigation label: "ST Training"
+ Navigation label: "RunCoach"
```

### 2. **Dashboard Sections**
```jsx
<Dashboard>
  <DailySummaryCard />      // NY - AI oppsummering
  <GarminStatusWidget />    // NY - Synk status
  <TodaysWorkoutCard />     // Eksisterende (forbedret)
  <WeekStatsGrid />         // Eksisterende
  <NutritionQuickView />    // NY - Mat overview
  <RecentWorkoutsList />    // Eksisterende
  <CoachQuickAccess />      // NY - Quick chat
</Dashboard>
```

### 3. **Navigasjon**
```diff
navItems:
- { to: '/', icon: Home, label: 'Hjem' }
- { to: '/workouts', icon: Dumbbell, label: 'Økter' }
- { to: '/workouts/new', icon: Plus, label: 'Logg', isAction: true }
- { to: '/nutrition', icon: Apple, label: 'Mat' }
+ { to: '/plan', icon: Calendar, label: 'Plan' }  // Synlig i nav!
- { to: '/chat', icon: MessageCircle, label: 'Chat' }
+ { to: '/chat', icon: MessageCircle, label: 'Coach' }  // Bedre navn
```

---

## 📝 OPPSUMMERING

### Hovedproblemer løst:
1. ✅ Generisk navn → "RunCoach" (profesjonelt, moderne)
2. ✅ Manglende AI-oppsummering → Daglig AI insight på Dashboard
3. ✅ Ingen Garmin-integrasjon → Full import/eksport
4. ✅ Gjemt planlegger → Synlig i navigasjon
5. ✅ Dårlig oversikt → Dashboard med alle nøkkeldata

### Forventet Resultat:
- 📱 Profesjonell, moderne app
- 🎯 Fokusert på løping som hovedmål
- 🤖 AI-drevet insights hver dag
- ⚡ Sømløs Garmin-integrasjon
- 🎨 Visuelt konsistent og polert

---

**Neste steg**: Velg hvilke forslag du vil implementere først, så lager vi dem!
