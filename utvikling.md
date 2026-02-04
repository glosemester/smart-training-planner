# Utviklingsplan: Smart Training Planner
**Omfattende funksjonsliste for en komplett PT- og treningsapp.**

## Visjon
Skape den ultimate treningspartneren som kombinerer data-drevet innsikt (Whoop, Strava), adaptiv AI-coaching, og et engasjerende community. Appen skal ikke bare logge trening, men *forstå* utøveren og veilede dem mot målene sine gjennom en helhetlig tilnærming til trening, ernæring og livsstil.

---

## Fase 1: Fundamentet & AI Coach (✅ Fullført / 🚧 Pågående)
Etablering av kjernesystemer for data og intelligent veiledning.
*   **Kjernedata:**
    *   [x] Integrasjon med Whoop (Recovery, Søvn, Strain).
    *   [x] Strava-import for aktiviteter (GPS, distanse, tempo).
    *   [x] Data Hub dashboard for helsemålinger.
*   **AI Coach (Mental State):**
    *   [x] Mental State Model (BDI) som tolker data og humør.
    *   [x] Personlige råd basert på dagsform (Recovery-styrt).
    *   [x] Interaktivt "Chat med Coach"-grensesnitt.
*   **Planlegging:**
    *   [x] Ukesplanlegger for trening.
    *   [x] Visuell oppsummering av uken (Algoritmisk kunst).

## Fase 2: Avansert Personlig Trening (Neste steg)
Gjøre appen til en ekte Personlig Trener som tilpasser seg i sanntid.
*   **Adaptiv Treningsplan:**
    *   [ ] Autogenererte treningsprogrammer basert på mål (f.eks. Maraton på 4t, Ned i vekt, Bli sterkere).
    *   [ ] *Dynamisk justering:* Hvis Whoop-recovery er rød (<33%), endrer appen automatisk dagens økt til "Lett restitusjon" eller "Hvile".
    *   [ ] Progresjonsstyring: Automatisk økning av belastning over tid.
*   **Økt-detaljer:**
    *   [ ] Strukturerte økter (Oppvarming, Hoveddel, Nedtrapping).
    *   [ ] Løpskalkulator (Estimering av løpstider basert på VO2max/terskel).
    *   [ ] Styrkeøvelse-bibliotek med videoinstruksjoner.

## Fase 3: Ernæring & Livsstil
En helhetlig utøver trenger drivstoff.
*   **Smart Kosthold:**
    *   [ ] AI-genererte matplaner tilpasset treningsmengde og mål.
    *   [ ] "Smart kjøleskap": Forslag til oppskrifter basert på ingredienser du har.
    *   [ ] Hydrerings-sporing koblet til svette/aktivitet.
    *   [x] (Delvis) AI Oppskrifter og Handleliste-generator.
*   **Syklus-basert trening (For kvinner):**
    *   [ ] Tilpasning av trening basert på menstruasjonssyklus (Whoop-syklus).

## Fase 4: Samhold & Konkurranse (Community)
Gjør trening sosialt og motiverende.
*   **Sosialt:**
    *   [ ] Vennelister og Activity Feed.
    *   [ ] Grupper/Klubber (f.eks. "Hjemmekontor-løperne").
    *   [ ] Deling av økter med bilde-overlay (Instagram-vennlig eksport).
*   **Utfordringer:**
    *   [ ] Månedlige utfordringer (f.eks. "Løp 100km i mars").
    *   [ ] Leaderboards (Globalt og venner).
    *   [ ] "Ghost Runner": Løp mot din egen eller andres tidligere tid.

## Fase 5: Kunnskap & Mestring (Content Academy)
Bli en smartere utøvelse gjennom læring.
*   **Innhold:**
    *   [ ] Bibliotek med artikler om treningsteori, ernæring og restitusjon.
    *   [ ] Teknikk-videoer (Løpeteknikk, Styrkeløft).
    *   [ ] Ekspert-intervjuer eller podcast-integrasjon.
*   **AI-Analyse:**
    *   [ ] "Form-sjekk": Last opp video av løpeteknikk eller knebøy, få AI-feedback.

## Fase 6: Gamification & Retensjon
Gjør det gøy å logge på hver dag.
*   **Spill-elementer:**
    *   [ ] Levels og XP-system ("Level 10 Runner").
    *   [ ] Badges/Trofeer for milepæler (f.eks. "Early Bird" for morgenøkter, "Marathoner").
    *   [ ] Streaks (Dager med aktivitet/logging).
*   **Belønninger:**
    *   [ ] Fiktive valuta/poeng som kan låse opp nye app-temaer eller avatar-utstyr.

## Teknisk Roadmap & Plattform
*   **Mobile Experience:**
    *   [ ] Full PWA (Progressive Web App) støtte for "Install to Home Screen".
    *   [ ] Offline-støtte for treningsplan og logging.
    *   [ ] Push-notifikasjoner for påminnelser og motivasjon.
*   **Integrasjoner:**
    *   [ ] Apple Health / Google Fit (for skritt og vekt).
    *   [ ] Garmin Connect (Direkte import hvis Strava ikke er nok).
    *   [ ] Kalender-sync (Google Calendar).

---
**Neste anbefalte fokus:** Fase 2 (Adaptiv Treningsplan) eller fullføre Fase 3 (Ernæring) som allerede er påbegynt.
