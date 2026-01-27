# Integrasjons-research: Apple Health, Garmin og Strava

## 📱 Apple Health (HealthKit)

### Oversikt
Apple Health er en innebygd app på iOS som samler helserelatert data fra ulike kilder.

### Teknisk tilgang
**HealthKit API:**
- ✅ Native iOS apps kan bruke HealthKit API
- ❌ **Web-apper har IKKE direkte tilgang til HealthKit**
- Løsning: Hybrid app med Capacitor eller React Native

### Implementasjonsalternativer

#### 1. **Capacitor Plugin** (Anbefalt for PWA)
```bash
npm install @capacitor-community/health
```

**Fordeler:**
- Holder PWA-arkitekturen
- Kan fortsatt deploye som web app
- Native app-wrapper for iOS

**Ulemper:**
- Krever iOS app-bygg med Xcode
- Må publiseres på App Store
- Ekstra kompleksitet

**Kode-eksempel:**
```javascript
import { Health } from '@capacitor-community/health'

// Be om tilgang
await Health.requestAuthorization({
  read: ['steps', 'distance', 'heart_rate', 'workouts'],
  write: []
})

// Les treningsøkter
const workouts = await Health.queryWorkouts({
  startDate: new Date('2024-01-01'),
  endDate: new Date()
})
```

#### 2. **Manual export (kortere term)**
Brukere kan eksportere treningsdata fra Apple Health og laste opp en fil.

**Fordeler:**
- Ingen app-bygg nødvendig
- Funger i dagens PWA

**Ulemper:**
- Manuell prosess
- Ikke sanntidsdata

---

## 🏃 Garmin

### API Oversikt
**Garmin Connect API:**
- ✅ Offisiell API tilgjengelig
- ✅ OAuth 2.0 autentisering
- ✅ Kan hente aktiviteter, puls, søvn, etc.

### Implementasjon

#### Oppsett
1. **Registrer app på Garmin Developer Portal:**
   - https://developer.garmin.com/
   - Få Consumer Key og Consumer Secret

2. **OAuth Flow:**
```javascript
// Redirect til Garmin for autentisering
const authUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${requestToken}`

// Callback mottar oauth_token og oauth_verifier
// Bytt til access token
```

3. **Hent aktiviteter:**
```javascript
// API endpoint
GET https://apis.garmin.com/wellness-api/rest/activities

// Response
[
  {
    "activityId": 12345,
    "activityName": "Running",
    "startTimeGMT": "2024-01-15T10:00:00",
    "duration": 2400,
    "distance": 10000,
    "averageHR": 145,
    "calories": 650
  }
]
```

### Kostnader
- ✅ **GRATIS** for individuelle utviklere
- Betaling kun for enterprise-løsninger

### Implementasjonsplan
1. Lag Netlify function for OAuth og API-kall
2. Lag UI for Garmin-tilkobling i appen
3. Sync-knapp som henter nye aktiviteter
4. Automatisk konvertering til vårt workout-format

---

## 🚴 Strava

### API Oversikt
**Strava API v3:**
- ✅ Svært populær API
- ✅ OAuth 2.0 autentisering
- ✅ Rik data om aktiviteter
- ✅ Webhooks for sanntidsoppdateringer

### Implementasjon

#### Oppsett
1. **Registrer app på Strava:**
   - https://www.strava.com/settings/api
   - Få Client ID og Client Secret

2. **OAuth Flow:**
```javascript
// Redirect til Strava
const authUrl = `https://www.strava.com/oauth/authorize?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=activity:read_all`

// Exchange code for token
POST https://www.strava.com/oauth/token
{
  "client_id": CLIENT_ID,
  "client_secret": CLIENT_SECRET,
  "code": CODE,
  "grant_type": "authorization_code"
}
```

3. **Hent aktiviteter:**
```javascript
GET https://www.strava.com/api/v3/athlete/activities

// Response
[
  {
    "id": 123456789,
    "name": "Morning Run",
    "type": "Run",
    "start_date": "2024-01-15T10:00:00Z",
    "distance": 10000.0,
    "moving_time": 2400,
    "elapsed_time": 2450,
    "average_heartrate": 145.0,
    "max_heartrate": 165.0,
    "elevation_gain": 150.0
  }
]
```

4. **Webhooks (Sanntids-sync):**
```javascript
// Strava sender webhook når ny aktivitet lastes opp
POST /webhook-callback
{
  "aspect_type": "create",
  "object_type": "activity",
  "object_id": 123456789,
  "owner_id": 12345
}
```

### Rate Limits
- 100 requests per 15 minutes
- 1000 requests per day
- **GRATIS** for personlig bruk

### Implementasjonsplan
1. Lag Netlify function for OAuth
2. Lag Netlify function for webhook-mottak
3. UI for Strava-tilkobling
4. Automatisk sync av nye aktiviteter via webhook

---

## 🎯 Anbefalt implementering

### Prioritet 1: **Strava** (Enklest og mest populær)
- Raskest å implementere
- Mange løpere bruker allerede Strava
- Webhooks for automatisk sync
- Rik data om aktiviteter

### Prioritet 2: **Garmin**
- Mange bruker Garmin-klokker
- God API-dokumentasjon
- Ingen kostnad

### Prioritet 3: **Apple Health**
- Krever native iOS app
- Mer kompleks implementering
- Vurder hvis stor etterspørsel fra brukere

---

## 📋 Implementasjonsoppgaver

### Strava Integration (Estimat: 3-4 timer)

1. **Backend (Netlify Functions):**
   - [ ] `strava-auth.js` - OAuth flow
   - [ ] `strava-sync.js` - Hent aktiviteter
   - [ ] `strava-webhook.js` - Motta webhooks

2. **Frontend:**
   - [ ] Settings-side med integrasjoner
   - [ ] "Koble til Strava"-knapp
   - [ ] Sync-status indikator
   - [ ] Liste over synkede aktiviteter

3. **Database:**
   - [ ] Lagre Strava access token i Firestore (kryptert)
   - [ ] Koble Strava activity ID til våre workouts

4. **Testing:**
   - [ ] Test OAuth flow
   - [ ] Test manuell sync
   - [ ] Test webhook-mottak

### Garmin Integration (Estimat: 4-5 timer)
- Samme struktur som Strava
- Ekstra tid pga OAuth 1.0a er mer kompleks

### Apple Health (Estimat: 8-12 timer)
- Krever Capacitor-oppsett
- iOS app-bygg
- Testing på fysisk enhet

---

## 🔐 Sikkerhet

**Viktig:**
- ✅ Lagre access tokens kryptert i Firestore
- ✅ Bruk HTTPS for alle API-kall
- ✅ Valider webhook-signaturer
- ✅ Implementer token refresh
- ✅ La brukere koble fra integrasjoner
- ✅ Slett tokens ved disconnect

---

## 💡 Brukeropplevelse

### Foreslått flyt:
1. Bruker går til Settings → Integrasjoner
2. Klikker "Koble til Strava/Garmin"
3. OAuth-redirect → autorisasjon
4. Tilbake til app med suksessmelding
5. Første sync kjører automatisk
6. Nye aktiviteter synkes automatisk (webhook)
7. Bruker kan se hvilke økter som er importert
8. Bruker kan manuelt kjøre sync hvis nødvendig

---

## 🚀 Neste steg

**Anbefaling:**
Start med **Strava-integrasjon** fordi:
- Raskest å implementere
- Største brukerbase blant seriøse løpere
- Bedre API-dokumentasjon
- Webhooks for sanntids-sync
- GRATIS

Hvis vellykket, legg til Garmin etterpå.
Apple Health kun hvis sterkt etterspurt av brukere.
