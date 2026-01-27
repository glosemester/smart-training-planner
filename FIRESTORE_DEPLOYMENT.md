# 🔒 Firestore Security Rules - KRITISK DEPLOY

## ⚠️ VIKTIG: Dette må gjøres ASAP!

Appen kan ikke lagre måltider eller treningsdata før Firestore sikkerhet-reglene er deployet.

**Feilmelding du ser nå:** "Missing or insufficient permissions"

---

## 🚀 Rask Deploy (5 minutter)

### Metode 1: Firebase Console (Enklest - Anbefalt!)

1. **Åpne Firebase Console**
   - Gå til: https://console.firebase.google.com/
   - Logg inn med Google-kontoen din

2. **Velg prosjekt**
   - Klikk på "smart-training-planner" (eller ditt prosjektnavn)

3. **Naviger til Firestore Rules**
   - Klikk på "Firestore Database" i venstre meny
   - Klikk på "Rules" fanen (øverst)

4. **Kopier og lim inn reglene**
   - Åpne `firestore.rules` filen i repoet
   - Kopier ALT innhold
   - Lim inn i Firebase Console (erstatt eksisterende regler)

5. **Publiser**
   - Klikk den store blå **"Publish"** knappen
   - Vent 5-10 sekunder til reglene er aktive

6. **Ferdig!** 🎉
   - Test ved å prøve å legge til et måltid i appen
   - Feilen skal nå være borte

---

### Metode 2: Firebase CLI (For avanserte brukere)

Hvis du foretrekker kommandolinje:

```bash
# 1. Installer Firebase CLI (hvis ikke allerede installert)
npm install -g firebase-tools

# 2. Logg inn på Firebase
firebase login

# 3. Gå til prosjektmappen
cd /path/to/smart-training-planner

# 4. Initialiser Firebase (hvis ikke gjort før)
firebase init firestore
# Velg ditt prosjekt
# Velg "firestore.rules" som rules fil
# Velg standard for indexes

# 5. Deploy kun Firestore rules
firebase deploy --only firestore:rules

# Ferdig! Reglene er nå live.
```

---

## 📋 Hva gjør disse reglene?

`firestore.rules` sikrer at:

✅ **Kun innloggede brukere** kan lese/skrive data
✅ **Brukere ser kun sine egne data** (isolert per bruker)
✅ **Alle subsamlinger er sikret**:
   - `/users/{userId}/workouts` ✓
   - `/users/{userId}/meals` ✓
   - `/users/{userId}/trainingPlans` ✓
✅ **Uautorisert tilgang blokkeres**

---

## 🧪 Verifiser at det virker

Etter deploy:

1. Åpne appen (https://din-app.netlify.app)
2. Gå til **Mat** (Apple-ikon i bunnen)
3. Klikk **"+"** for å legge til måltid
4. Fyll inn beskrivelse og klikk **"Analyser med AI"**
5. Hvis du kan lagre måltidet ➡️ **Reglene virker!** ✅
6. Hvis du fortsatt ser feil ➡️ Vent 1 minutt og prøv igjen (cache)

---

## 🆘 Trenger du hjelp?

### Problem: "Firebase CLI ikke funnet"
**Løsning:** Bruk Firebase Console (Metode 1) i stedet

### Problem: "Permission denied" ved deploy
**Løsning:**
- Sjekk at du er logget inn: `firebase login`
- Sjekk at du har rettigheter til Firebase-prosjektet

### Problem: Fortsatt får "Missing permissions" etter deploy
**Løsning:**
1. Vent 1-2 minutter (cache må tømmes)
2. Logg ut og inn igjen i appen
3. Clear browser cache
4. Verifiser at reglene ble publisert i Firebase Console → Firestore Database → Rules

---

## 📸 Skjermbilder av prosessen

### Firebase Console → Firestore Database → Rules
Du skal se noe som ligner:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    ...
  }
}
```

Erstatt ALT med innholdet fra `firestore.rules` og klikk **Publish**.

---

## ✅ Sjekkliste

- [ ] Åpnet Firebase Console
- [ ] Navigert til Firestore Database → Rules
- [ ] Kopiert innhold fra `firestore.rules`
- [ ] Limt inn i console
- [ ] Klikket "Publish"
- [ ] Ventet 10 sekunder
- [ ] Testet å legge til måltid i appen
- [ ] **Det virker!** 🎉

---

**Estimert tid:** 5 minutter
**Kompleksitet:** Veldig enkel (copy-paste)
**Kritikalitet:** 🔴 **HØYEST** - appen fungerer ikke uten dette!
