# Apple Health Integrasjon

## Eksporter fra Apple Health

1. Åpne **Helse-appen** på iPhone
2. Trykk på profilbildet øverst til høyre
3. Scroll ned til **"Eksporter helsedata"**
4. Trykk **"Eksporter"**
5. Lagre `export.zip` filen

## Importer til Smart Training Planner

### Metode 1: XML Parser (manuell import)

```javascript
// src/services/appleHealthService.js

export async function parseAppleHealthXML(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')

  // Hent søvndata
  const sleepRecords = xml.querySelectorAll('Record[type="HKCategoryTypeIdentifierSleepAnalysis"]')

  const sleepData = []
  sleepRecords.forEach(record => {
    const start = new Date(record.getAttribute('startDate'))
    const end = new Date(record.getAttribute('endDate'))
    const duration = (end - start) / (1000 * 60 * 60) // timer

    sleepData.push({
      date: start.toISOString().split('T')[0],
      duration,
      start,
      end
    })
  })

  // Hent hvilepuls
  const hrvRecords = xml.querySelectorAll('Record[type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN"]')
  const restingHRRecords = xml.querySelectorAll('Record[type="HKQuantityTypeIdentifierRestingHeartRate"]')

  return {
    sleep: aggregateSleepByDay(sleepData),
    restingHR: parseHRData(restingHRRecords),
    hrv: parseHRVData(hrvRecords)
  }
}

function aggregateSleepByDay(sleepData) {
  const byDay = {}

  sleepData.forEach(({ date, duration }) => {
    if (!byDay[date]) {
      byDay[date] = 0
    }
    byDay[date] += duration
  })

  return Object.entries(byDay).map(([date, hours]) => ({
    date,
    hours: Math.round(hours * 10) / 10
  }))
}
```

### Metode 2: HealthKit API (krever native app)

For live-synkronisering trenger du:
- React Native app ELLER
- Progressive Web App med Web Bluetooth
- Apple HealthKit permissions

## Datatyper vi kan hente

Fra Apple Health XML:

### Søvn
- `HKCategoryTypeIdentifierSleepAnalysis`
- Gir søvnvarighet per natt
- Kan skille mellom lett/dyp søvn

### Puls
- `HKQuantityTypeIdentifierRestingHeartRate` - Hvilepuls
- `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` - HRV (restitusjon)
- `HKQuantityTypeIdentifierHeartRate` - Gjennomsnittspuls

### Aktivitet
- `HKQuantityTypeIdentifierDistanceWalkingRunning` - Løpedistanse
- `HKQuantityTypeIdentifierStepCount` - Skritt
- `HKQuantityTypeIdentifierActiveEnergyBurned` - Kalorier

### Trening
- `HKWorkoutTypeIdentifier` - Treningsøkter
  - `HKWorkoutActivityTypeRunning`
  - `HKWorkoutActivityTypeTraditionalStrengthTraining`
  - `HKWorkoutActivityTypeCrossTraining`

## Implementeringsplan

### Fase 1: Manual XML Import (1-2 timer)
1. Legg til fil-upload i HealthSync.jsx
2. Implementer XML parser
3. Lagre data til Firestore (`users/{uid}/health/{date}`)
4. Vis importert data i dashboard

### Fase 2: Automatisk synkronisering (vanskeligere)
Krever:
- React Native app (iOS)
- HealthKit integration
- Background sync
- OAuth mellom app og webapp

Anbefaling: Start med Fase 1 (manual import).
