# Smart Training Planner 🏃‍♂️💪

AI-drevet treningsplanlegger for løping, Hyrox og CrossFit.

## Funksjoner

- 📊 **Dashboard** - Oversikt over treningsaktivitet
- 📝 **Treningslogging** - Logg løping og styrkeøkter med detaljer
- 🤖 **AI Treningsplan** - Genererer personlig ukesplan via Claude AI
- 📈 **Statistikk** - Visualiser progresjon over tid
- ❤️ **Helsedata** - Integrasjon med Google Fit (kommer)

## Teknisk Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage)
- **AI:** Anthropic Claude API
- **Hosting:** Netlify

## Komme i gang

### 1. Klon og installer

```bash
git clone https://github.com/din-bruker/smart-training-planner.git
cd smart-training-planner
npm install
```

### 2. Sett opp Firebase

1. Gå til [Firebase Console](https://console.firebase.google.com/)
2. Opprett nytt prosjekt
3. Aktiver Authentication med Google provider
4. Opprett Firestore database
5. Opprett Storage bucket
6. Kopier config-verdier

### 3. Sett opp miljøvariabler

Kopier `.env.example` til `.env` og fyll inn:

```bash
cp .env.example .env
```

Rediger `.env`:
```env
VITE_FIREBASE_API_KEY=din-api-key
VITE_FIREBASE_AUTH_DOMAIN=ditt-prosjekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ditt-prosjekt
VITE_FIREBASE_STORAGE_BUCKET=ditt-prosjekt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

VITE_ANTHROPIC_API_KEY=sk-ant-api...
VITE_ALLOWED_EMAIL=din-email@gmail.com
```

### 4. Kjør lokalt

```bash
npm run dev
```

Åpne http://localhost:3000

### 5. Deploy til Netlify

```bash
# Push til GitHub
git add .
git commit -m "Initial commit"
git push

# Koble til Netlify
# 1. Gå til netlify.com
# 2. "New site from Git"
# 3. Velg ditt repo
# 4. Legg til miljøvariabler i Netlify dashboard
# 5. Deploy!
```

## Firestore Security Rules

Legg til disse reglene i Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kun autentiserte brukere kan lese/skrive egne data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /workouts/{workoutId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /plans/{planId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /healthData/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Mappestruktur

```
src/
├── components/      # React-komponenter
├── config/          # Firebase og Anthropic config
├── contexts/        # React Context providers
├── data/            # Statiske data (treningstyper etc)
├── hooks/           # Custom React hooks
├── services/        # API-kall og business logic
└── utils/           # Hjelpefunksjoner
```

## Videreutvikling

Se `CLAUDE_CODE_INSTRUCTIONS.md` for detaljert utviklingsguide og neste steg.

## Lisens

Privat prosjekt.
