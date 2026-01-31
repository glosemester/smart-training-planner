# Prosjektstatus: Smart Training Planner - Oppdatering

Her er en detaljert oversikt over funksjonene som har blitt implementert i de siste arbeidsøktene. Fokus har vært på å gjøre applikasjonen "smartere" med en BDI-modell, mer visuell med Data Hub, og mer emosjonelt engasjerende med algoritmisk kunst.

## 1. AI Coach Foundation (BDI Model)
Vi har gått bort fra en rent reaktiv chatbot til en AI-trener med en egen "mental tilstand".

*   **Belief-Desire-Intention (BDI) Arkitektur**:
    *   **Beliefs ("Oppfatninger")**: AI-en analyserer treningsloggen din for å danne seg meninger om tilstanden din. F.eks. "Utøveren er sliten" (hvis recovery score er lav) eller "Utøveren har vært inaktiv".
    *   **Desires ("Ønsker")**: AI-en har mål på vegne av deg, som "Unngå skade" eller "Forbedre utholdenhet".
    *   **Intentions ("Intensjoner")**: Basert på oppfatninger og ønsker, danner AI-en en strategi for neste interaksjon. F.eks. "Foreslå hviledag" eller "Motive for hardøkt".
*   **Implementasjon**:
    *   `MentalStateService.js`: En ny tjeneste som beregner denne tilstanden kontinuerlig i bakgrunnen.
    *   **Backend Integrasjon**: Når du chatter med AI-en nå, sendes hele denne mentale tilstanden med i "prompten". Dette betyr at AI-en vet hvordan du ligger an *før* den svarer.

## 2. Data Hub Dashboard
Et nytt, sentralisert dashbord for å samle data fra ulike kilder, slik at du slipper å sjekke flere apper.

*   **Vær-data (Yr.no)**: Vi henter nå ekte værdata for Oslo (temperatur, nedbør, vind). Dette hjelper deg (og AI-en) å planlegge bekledning og rute.
*   **Training Load & Readiness**: En visuell fremstilling av ukas totalbelastning og din formstatus ("Readiness").
*   **Helse-metrikker (Mock)**: Klargjort visning for Hvilepuls, HRV og Søvn (foreløpig med test-data til Apple Health-integrasjon er på plass).
*   **Feilhåndtering**: Dashbordet håndterer nå tilfeller hvor data mangler ved å vise "0" eller standardverdier i stedet for å krasje eller skjule seg.

## 3. Algoritmisk Kunst: "Kinetic Erosion"
Vi har implementert et unikt konsept hvor treningsdataen din skaper kunst hver uke.

*   **Filosofi**: "Training as Geological Sculpting".
    *   Høy intensitet = Harde partikler som graver dype, skarpe kløfter (symboliserer anaerob innsats).
    *   Høyt volum (rolig løping) = Mange, myke partikler som polerer landskapet (symboliserer utholdenhet).
*   **Teknologi**:
    *   Bygget med **p5.js** for generativ grafikk.
    *   `KineticErosion.jsx`: En React-komponent som kjører denne simuleringen i nettleseren din.
    *   **Personlig**: Kunsten er "seedet" med dine treningsdata, så bildet blir unikt for din treningsuke.
*   **Visning**: Ligger nå som et eget kort ("Ukens Kunstverk") nederst på dashbordet. Hvis du ikke har trent ennå i uken, vises et eksempelbilde.

## 4. Infrastruktur & Distribusjon
*   **Firebase Functions**: Oppdatert backend-logikk for å støtte de nye AI-funksjonene.
*   **Hosting**: Appen er vellykket deployet og kjører live.
*   **Stabilitet**: Fikset bugs hvor komponenter ble skjult hvis data manglet.

---
**Neste steg (forslag):**
1.  Fullføre Apple Health / Strava integrasjonene helt (fjerne mock-data).
2.  Utvide AI-treneren til å proaktivt sende deg meldinger (Notifications) basert på intensjonene sine.
