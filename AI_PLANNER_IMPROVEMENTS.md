# AI-Planlegger Forbedringer - Implementeringsplan

## 🎯 Overordnet mål
Gjøre AI-planleggeren fleksibel, tilpasningsdyktig og målrettet basert på brukerens faktiske behov.

---

## 📋 FASE 1: Pre-Planning Wizard (4-5 timer)

### Før AI genererer plan, still disse spørsmålene:

```javascript
// Ny komponent: src/components/planning/PlanningWizard.jsx

const wizardSteps = [
  {
    id: 'planType',
    question: 'Ønsker du kun plan for løping eller vil du ha full plan?',
    options: [
      {
        value: 'running_only',
        label: 'Kun løping',
        description: 'Jeg trener Hyrox/CrossFit på senter med egne økter'
      },
      {
        value: 'full_plan',
        label: 'Full plan (løping + styrke)',
        description: 'Jeg vil ha plan for både løping og styrke/Hyrox/CrossFit'
      }
    ]
  },
  {
    id: 'goal',
    question: 'Hva er ditt hovedmål?',
    options: [
      { value: 'general_fitness', label: 'Generell form' },
      { value: 'race', label: 'Konkurranse (med dato)' },
      { value: 'distance', label: 'Løpe lengre distanser' },
      { value: 'speed', label: 'Bli raskere' }
    ],
    // Hvis 'race' valgt, vis:
    followUp: {
      raceDate: 'Velg konkurransedato',
      raceDistance: '5km / 10km / Halvmaraton / Maraton / Hyrox',
      goalTime: 'Målsetting (valgfritt)'
    }
  },
  {
    id: 'availability',
    question: 'Hvor mange dager kan du trene per uke?',
    type: 'slider',
    min: 2,
    max: 7,
    default: 4
  },
  {
    id: 'preferredDays',
    question: 'Hvilke dager passer best for deg?',
    type: 'multiselect',
    options: ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']
  },
  {
    id: 'sessionDuration',
    question: 'Hvor lang tid har du per økt?',
    options: [
      { value: 30, label: '30-45 min' },
      { value: 60, label: '45-75 min' },
      { value: 90, label: '75-90 min' },
      { value: 120, label: '90+ min (helg/langtur)' }
    ]
  },
  {
    id: 'preferences',
    question: 'Spesielle preferanser? (valgfritt)',
    type: 'textarea',
    placeholder: 'F.eks: Foretrekker morgenløp, unngå intervaller på mandager, etc.'
  }
]
```

### Datastruktur for plan-preferanser:

```javascript
// Firestore: users/{uid}/planPreferences
{
  planType: 'running_only' | 'full_plan',
  goal: {
    type: 'race' | 'distance' | 'speed' | 'general_fitness',
    raceDate: Date | null,
    raceDistance: '5km' | '10km' | 'half' | 'full' | 'hyrox' | null,
    goalTime: string | null  // "45:00" format
  },
  availability: {
    daysPerWeek: number,
    preferredDays: string[],
    maxSessionDuration: number
  },
  preferences: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🎨 FASE 2: Redigerbar Treningsplan (5-6 timer)

### Funksjonalitet:

#### A. Drag & Drop økter mellom dager
```javascript
// Bruk react-beautiful-dnd eller @dnd-kit/core

<DragDropContext onDragEnd={handleDragEnd}>
  {weekDays.map(day => (
    <Droppable droppableId={day} key={day}>
      {sessions.filter(s => s.day === day).map(session => (
        <Draggable draggableId={session.id} index={idx}>
          <SessionCard session={session} />
        </Draggable>
      ))}
    </Droppable>
  ))}
</DragDropContext>

// Når økt flyttes, oppdater i Firestore
async function handleDragEnd(result) {
  const { source, destination, draggableId } = result

  if (!destination) return

  // Oppdater session.day i planen
  await updatePlanSession(planId, sessionId, {
    day: destination.droppableId,
    movedBy: 'user',
    movedAt: new Date()
  })
}
```

#### B. Inline redigering av økter
```javascript
// Klikk på en økt for å redigere
<SessionCard
  session={session}
  onEdit={(sessionId) => setEditingSession(sessionId)}
/>

// Edit-modal:
- Endre tittel
- Endre beskrivelse
- Endre varighet
- Endre intensitet
- Slett økt
- Marker som "fullført" (hvis allerede utført)
```

#### C. Legg til egne økter
```javascript
// "Legg til økt" knapp for hver dag
<AddSessionButton
  day="monday"
  onAdd={(day) => openAddSessionModal(day)}
/>

// Brukeren kan legge til:
- Hyrox-økt på senter (beskrivelse)
- CrossFit-økt
- Annen aktivitet
- Hviledag
```

---

## 🔄 FASE 3: Adaptiv Planlegging (6-8 timer)

### Konsept: Planen tilpasser seg faktisk gjennomføring

#### A. Sammenligne planlagt vs faktisk
```javascript
// Daglig sammenligning
async function compareActualVsPlanned(userId, weekStart) {
  const plan = await getPlanForWeek(userId, weekStart)
  const actualWorkouts = await getWorkoutsForWeek(userId, weekStart)

  const analysis = {
    completed: [],      // Økter som ble gjort som planlagt
    modified: [],       // Økter gjort, men annerledes enn planlagt
    skipped: [],        // Planlagte økter som ikke ble gjort
    extra: [],          // Økter som ikke var planlagt
    totalLoadDiff: 0    // Forskjell i total belastning (km/timer)
  }

  // Analyser hver planlagt økt
  for (const plannedSession of plan.sessions) {
    const matchingWorkout = findMatchingWorkout(
      actualWorkouts,
      plannedSession
    )

    if (!matchingWorkout) {
      analysis.skipped.push(plannedSession)
    } else if (isSignificantlyDifferent(matchingWorkout, plannedSession)) {
      analysis.modified.push({
        planned: plannedSession,
        actual: matchingWorkout,
        differences: calculateDifferences(matchingWorkout, plannedSession)
      })
    } else {
      analysis.completed.push(plannedSession)
    }
  }

  // Finn uplanlagte økter
  for (const workout of actualWorkouts) {
    if (!hasMatchingPlannedSession(workout, plan.sessions)) {
      analysis.extra.push(workout)
    }
  }

  return analysis
}
```

#### B. AI justerer neste uke basert på faktisk gjennomføring
```javascript
// Automatisk justering hver søndag kveld / mandag morgen
async function adjustUpcomingPlan(userId, analysis) {
  const prompt = `
Basert på faktisk gjennomføring forrige uke, juster neste ukes plan:

**PLANLAGT FORRIGE UKE:**
${JSON.stringify(lastWeekPlan, null, 2)}

**FAKTISK GJENNOMFØRT:**
${JSON.stringify(analysis, null, 2)}

**OBSERVASJONER:**
- Hoppet over: ${analysis.skipped.length} økter
- Ekstra økter: ${analysis.extra.length}
- Total belastning: ${analysis.totalLoadDiff > 0 ? 'høyere' : 'lavere'} enn planlagt

**JUSTERINGER:**
Vurder følgende:
1. Hvis brukeren hoppet over økter: Reduser intensitet/volum neste uke?
2. Hvis brukeren gjorde mer: Kan vi øke litt?
3. Hvis mønster viser preferanse for visse dager: Tilpass planlegging
4. Balanser belastning for å unngå overtrening

Lag justert plan for neste uke i samme JSON-format.
`

  const adjustedPlan = await generateTrainingPlan(prompt)
  return adjustedPlan
}
```

#### C. Brukernotifikasjoner
```javascript
// Hvis brukeren avviker mye fra planen
if (analysis.skipped.length >= 2) {
  showNotification({
    type: 'suggestion',
    message: 'Du hoppet over 2 økter forrige uke. Vil du ha en lettere plan neste uke?',
    actions: [
      { label: 'Ja, reduser litt', action: 'reduce_load' },
      { label: 'Nei, behold intensitet', action: 'keep_plan' },
      { label: 'Generer ny plan', action: 'regenerate' }
    ]
  })
}
```

---

## 🎯 FASE 4: Målorientert Periodisering (4-5 timer)

### A. Sett mål med konkurransedato
```javascript
// Når bruker velger "race" i wizard
const goal = {
  type: 'race',
  raceDate: new Date('2024-09-15'),
  raceDistance: '10km',
  goalTime: '45:00',
  weeksUntilRace: calculateWeeks(today, raceDate)
}

// AI lager periodisert plan:
// Uke 1-4:   Base building (80/20, lav intensitet, øk volum)
// Uke 5-8:   Intensitetsøkning (tempoløp, intervaller)
// Uke 9-11:  Peak phase (høy belastning, race-spesifikk)
// Uke 12:    Taper (reduser 40-50%, oppretthold intensitet)
```

### B. Progress tracking mot mål
```javascript
// Dashboard-widget: "10km på 45:00 om 8 uker"
<GoalProgressCard>
  <CountdownTimer targetDate={goal.raceDate} />
  <ProgressBar
    current={estimatedCurrentPace}
    target={goal.goalTime}
  />
  <Milestones>
    ✓ Uke 1-4: Base building
    → Uke 5-8: Intensitet (nåværende)
    ○ Uke 9-11: Peak
    ○ Uke 12: Taper
  </Milestones>
</GoalProgressCard>
```

---

## 📊 DATAMODELL

### Plan med metadata
```javascript
// Firestore: users/{uid}/plans/{planId}
{
  weekStart: Date,
  weekNumber: number,
  planType: 'running_only' | 'full_plan',

  // Målsetting
  goal: {
    type: string,
    raceDate: Date | null,
    raceDistance: string | null,
    goalTime: string | null
  },

  // AI-generert innhold
  focus: string,
  totalLoad: { ... },
  sessions: [
    {
      id: string,
      day: 'monday' | 'tuesday' | ...,
      type: string,
      title: string,
      description: string,
      duration_minutes: number,
      details: { ... },

      // Metadata for tracking
      status: 'planned' | 'completed' | 'skipped' | 'modified',
      completedWorkoutId: string | null,
      movedBy: 'ai' | 'user' | null,
      movedFrom: string | null,
      movedAt: Date | null
    }
  ],

  // Adaptiv planlegging
  adjustments: {
    basedOnPreviousWeek: boolean,
    changes: string[],
    reasoning: string
  },

  generatedBy: 'ai' | 'user',
  generatedAt: Date,
  lastModified: Date
}
```

---

## 🚀 IMPLEMENTERINGSREKKEFØLGE

### Sprint 1 (Uke 1): Wizard & Plan Types
1. ✅ Planning Wizard UI (2 dager)
2. ✅ Lagre preferanser i Firestore (1 dag)
3. ✅ Oppdater AI prompt basert på wizard-svar (1 dag)

### Sprint 2 (Uke 2): Redigerbar Plan
4. ✅ Drag & Drop økter (2 dager)
5. ✅ Inline edit sessions (1 dag)
6. ✅ Add/delete sessions (1 dag)

### Sprint 3 (Uke 3): Adaptiv AI
7. ✅ Compare actual vs planned (2 dager)
8. ✅ Auto-adjust future plans (2 dager)
9. ✅ Notifikasjoner og forslag (1 dag)

### Sprint 4 (Uke 4): Målorientert
10. ✅ Goal setting i wizard (1 dag)
11. ✅ Periodisering logic (2 dager)
12. ✅ Progress tracking UI (1 dag)

**Total estimat:** 3-4 uker fullstack-arbeid

---

## 💡 QUICK WINS (Starter her)

### Prioritet 1 - Implementer FØRST (1-2 dager):
1. **Planning Wizard** med spørsmål om:
   - Kun løping vs full plan
   - Målsetting
   - Tilgjengelige dager

2. **Oppdater AI-prompt** til å respektere disse valgene

### Prioritet 2 - Deretter (1 uke):
3. **Drag & Drop** for å flytte økter
4. **Sammenligning** av planlagt vs faktisk

### Prioritet 3 - Til slutt (1 uke):
5. **Adaptiv justering** hver uke
6. **Målorientert planlegging**

---

## 🎯 SUKSESSKRITERIER

Når alt er implementert skal brukeren kunne:

- ✅ Velge kun løpeplan (fordi Hyrox/CrossFit gjøres på senter)
- ✅ Sette mål med konkurranse-dato
- ✅ Flytte økter mellom dager (drag & drop)
- ✅ Legge til egne Hyrox-økter i planen
- ✅ Få AI-justert plan basert på faktisk gjennomføring
- ✅ Se progress mot mål
- ✅ Ha fleksibel plan som tilpasser seg livssituasjonen

Dette gjør appen fra "treningsplanlegger" til "personlig AI-trener"! 🏆
