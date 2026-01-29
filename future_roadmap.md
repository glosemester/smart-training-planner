# 🚀 Future Roadmap: Smart Training App 2.0

**Mål:** Gjøre appen "Top Modern", engasjerende og teknisk robust.
**Status:** Planleggingsfase / Utkast

Denne planen tar appen fra en funksjonell treningsdagbok til en "Level 3" AI-drevet coach med moderne app-følelse.

---

## De 10 Trinnene (The Roadmap)

### Fase 1: Brukeropplevelse & Kjerne (UX Core)

#### 1. UX Foundation 2.0: "Alive Interface"
*Gjør at appen føles levende og responsiv.*
-   **Løsning:** Implementere **Framer Motion**.
-   **Detaljer:** Legg til "Page Transitions" (myk fade/slide mellom sider). Animerte tall som teller opp (stats). Knapper som har fysisk "trykk"-følelse (scale). Skelet-loading istedenfor spinnere.

#### 2. Offline-First Architecture
*Appen skal virke umiddelbart, uansett nettverk.*
-   **Løsning:** Migrere til **TanStack Query (React Query)** + **Vite PWA**.
-   **Detaljer:** Aggressiv caching av treningsdata. "Optimistic UI" updates (vis endring med en gang, sync i bakgrunnen). Gjøre appen installerbar (A2HS) med full offline støtte.

#### 3. Intelligent AI Coach (Voice & Context)
*Fra "tekst-chatbot" til "ekte coach".*
-   **Løsning:** Web Speech API + RAG (Retrieval Augmented Generation).
-   **Detaljer:** Legg til en mikrofon-knapp for å snakke med coachen. Gi AI-en tilgang til *hele* treningshistorikken for dypere innsikt ("Hvordan var pulsen min sammenlignet med i fjor?").

---

### Fase 2: Engasjement & Funksjoner (Engagement)

#### 4. Gamification Engine: "Level Up"
*Gjør trening avhengighetsskapende (på en god måte).*
-   **Løsning:** Et nytt "Achievements"-system.
-   **Detaljer:** Visualiser "Streaks" med ild-effekter. Del ut virtuelle merker for milepæler (f.eks. "Marathon Ready", "Early Bird"). Bruk **Lottie Files** for feirende konfetti-animasjoner.

#### 5. Social Squads & Challenges
*Trening er bedre sammen.*
-   **Løsning:** Firebase Realtime Database for sosiale feeds.
-   **Detaljer:** Lag "Squads" (treningsgrupper). Del økter automatisk til feeden. Ukentlige "Leaderboards" basert på poeng, ikke bare km (for å være inkluderende).

#### 6. Advanced Analytics: "Pro Insights"
*Gi brukeren data de ikke visste de trengte.*
-   **Løsning:** Treningsbelastning (Fitness/Fatigue) kalkulator.
-   **Detaljer:** Implementer en graf som viser "Formtopp" vs "Slitasje" (TSB - Training Stress Balance). Vis pulssoner i kakediagram.

#### 7. Wearable Hub (Health Integration)
*Dataflyt uten friksjon.*
-   **Løsning:** Terra API eller direkte Google Fit / Apple Health integrasjon.
-   **Detaljer:** Hent søvn, HRV og skritt automatisk. Tilpass dagens økt basert på "Body Battery" eller søvnscore automatisk.

---

### Fase 3: Profesjonalisering & Skalering (Pro Scale)

#### 8. Performance & "Instant" Feel
*Ingen ventetid.*
-   **Løsning:** Code Splitting & Image Optimization.
-   **Detaljer:** Bytt til moderne bildeformater (AVIF/WebP). Pre-fetch sider når brukeren hovrer over meny-linker. Oppnå 100/100 på Lighthouse.

#### 9. Accessibility (A11y) & Inkludering
*En app for alle.*
-   **Løsning:** Semantisk HTML audit + i18n.
-   **Detaljer:** Støtte for skjermlesere. Høy-kontrast modus (allerede påbegynt). Språkstøtte (Norsk/Engelsk toggle) med `i18next`.

#### 10. Pro Tier (Monetization Ready)
*Klar for business.*
-   **Løsning:** Stripe Integrasjon + "Pro" features låsing.
-   **Detaljer:** Lag en betalingsmur for "AI Coach" og "Advanced Analytics". Implementer abonnementsstyring i brukerprofilen.

---

## Hvordan løser vi dette? (Gjennomføringsstrategi)

Vi jobber i sprinter ("Steps"). For hver step følger vi denne loopen:
1.  **Plan:** Definer "User Stories" for steget.
2.  **Tech:** Velg bibliotek (f.eks. `framer-motion` for steg 1).
3.  **Build:** Implementer funksjonen isolert.
4.  **Measure:** Sjekk ytelse og UX.

Vil du at vi skal starte med **Step 1: UX Foundation** nå? Det vil gi den største umiddelbare "wow"-effekten.
