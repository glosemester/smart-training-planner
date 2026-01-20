# Feature Roadmap - Smart Training Planner

## 🎯 Nye funksjoner planlagt

### 1. 💬 Conversational AI for treningsplanlegging
**Mål:** Chat-interface hvor brukeren kan tilpasse treningsplanen gjennom dialog

#### Implementering:
```javascript
// Ny komponent: src/components/planning/AIPlannerChat.jsx
- Chat-interface med samtalehistorikk
- Brukeren kan stille spørsmål og justere planen
- AI husker kontekst fra tidligere i samtalen
- Eksempel spørsmål:
  * "Kan du legge til en intervalløkt på tirsdag?"
  * "Jeg er veldig sliten, kan du redusere intensiteten?"
  * "Hva bør jeg fokusere på for å løpe 10km under 45 minutter?"
```

**Teknisk:**
- Bruk Anthropic Messages API med `messages` array for kontekst
- Lagre chat-historikk i Firestore: `users/{uid}/chats/{chatId}`
- Streaming svar for bedre UX (Server-Sent Events)

**Estimat:** 4-6 timer

---

### 2. 📸 Bildeopplasting på treningsøkter
**Mål:** Brukere kan laste opp bilder fra treningsøkter

#### Implementering:
```javascript
// Utvide: src/components/workouts/LogWorkout.jsx
- Legg til bilde-upload felt
- Komprimér bilder før opplasting (allerede implementert i storageService.js)
- Vis thumbnails i workout list
- Fullskjerm-visning i workout detail
```

**Teknisk:**
- Bruk eksisterende `uploadWorkoutImage()` i storageService.js
- Lagre URLs i Firestore: `workouts/{id}.images: string[]`
- Maksimalt 3 bilder per økt (allerede definert i storageService)
- Bildestørrelser: 1920px bredde, 80% kvalitet

**Estimat:** 2-3 timer

---

### 3. 🤖 AI OCR for treningsdata fra bilder
**Mål:** Scan skjermbilder fra treningsklokker/apper og automatisk fyll inn data

#### Use cases:
- Screenshot fra Garmin/Polar/Strava
- Bilde av treningsskjerm på treningsklokke
- Screenshot fra Apple Health

#### Implementering:

##### Alternativ A: Anthropic Claude Vision (ANBEFALT)
```javascript
// Ny funksjon: src/services/ocrService.js

import Anthropic from '@anthropic-ai/sdk'

export async function extractWorkoutDataFromImage(imageFile) {
  // Konverter bilde til base64
  const base64Image = await fileToBase64(imageFile)

  // Send til Claude med vision
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: base64Image
          }
        },
        {
          type: "text",
          text: `Analyser dette bildet og ekstraher treningsdata.
          Returner JSON med følgende format:
          {
            "type": "easy_run|tempo|interval|long_run",
            "duration_minutes": number,
            "distance_km": number,
            "avgPace": "MM:SS",
            "avgHR": number,
            "maxHR": number,
            "elevation": number,
            "confidence": "high|medium|low"
          }

          Hvis du ikke finner data, sett confidence til "low" og returner null for ukjente verdier.`
        }
      ]
    }]
  })

  return JSON.parse(response.content[0].text)
}
```

**Flyt:**
1. Bruker velger bilde i LogWorkout
2. Klikk "Scan data fra bilde"
3. OCR kjører (via Netlify Function)
4. Autofyll skjema med ekstrahert data
5. Bruker kan redigere før lagring

**Estimat:** 3-4 timer

##### Alternativ B: Google Cloud Vision API
- Mindre nøyaktig for strukturert data
- Krever ekstra API-setup
- Ikke anbefalt for dette bruksområdet

---

## 📋 Implementeringsrekkefølge (anbefalt)

### Fase 1: Grunnleggende funksjoner (1-2 dager)
1. ✅ Bildeopplasting på økter (enklest)
2. ✅ AI OCR for treningsdata (bruker Claude Vision)

### Fase 2: Avansert AI (2-3 dager)
3. ✅ Conversational AI chat for planlegging

---

## 🛠️ Tekniske detaljer

### AI OCR - Støttede formater
- Garmin Connect screenshots
- Strava workout screenshots
- Apple Watch workout screenshots
- Polar Flow screenshots
- COROS screenshots
- Analog treningsklokke (distanse, tid synlig)

### AI OCR - Dataekstraksjon
**Høy confidence:**
- Tydelige tall med labels ("Distance", "Time", "Pace")
- Strukturerte UI-elementer
- God kontrast

**Medium confidence:**
- Noe uskarp tekst
- Manglende labels (må gjette fra kontekst)

**Lav confidence:**
- Veldig uskarpt bilde
- Dårlig belysning
- Refleksjoner/blending

### Feilhåndtering
```javascript
if (ocrResult.confidence === 'low') {
  showWarning('Kunne ikke lese all data fra bildet. Vennligst fyll inn manuelt.')
}
```

---

## 💡 Fremtidige forbedringer

### Fase 3 (senere)
- 🔄 Automatisk synkronisering med Strava/Garmin API
- 📊 AI-analyse av treningsbelastning over tid
- 🎯 Smart forslag basert på konkurransedato
- 🏃 Virtual training partner (AI som gir motivasjon)
- 📱 Push notifications for planlagte økter
- 🌐 Web Share API for deling av økter
- 🎨 Custom treningsplan-templates

---

## 📞 Kontakt for implementering

Klar til å implementere? Her er rekkefølgen:

1. **Start med bildeopplasting** (enklest, stor verdi)
2. **Deretter AI OCR** (imponerende feature)
3. **Til slutt conversational AI** (mest kompleks)

Hver feature kan implementeres og testes uavhengig.
