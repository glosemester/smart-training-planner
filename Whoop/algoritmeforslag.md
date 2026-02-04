Teknisk Spesifikasjon: AI-Algoritme for
Hybrid Trening (Hyrox/Løp)
Versjon: 1.0 Backend: Firebase (Firestore + Cloud Functions) Språk: TypeScript
1. Konseptuell Oversikt
Systemet er en adaptiv treningsgenerator designet for å balansere løping og styrke (Hyrox)
over en periode på 10–30 uker. Kjernen er en dynamisk periodiseringsmodell som justerer
seg basert på brukerens restitusjonsdata (HRV/sRPE).
1.1 Fysiologiske Faser
Algoritmen deler tidslinjen inn i fire faser med ulik vekting:
1. Base (40-50%): Høyt volum, lav intensitet. Strukturell tilvenning.
2. Build (30-40%): Økt intensitet, rase-spesifikke bakker (vertikale meter).
3. Peak (10-15%): Maksimal belastning, simulering av konkurranse.
4. Taper (2-3 uker): Reduksjon av volum (30-70%) for å toppe formen.
1.2 Mikrosyklus (Ukesplan)
Standard ukeoppsett for å minimere interferens mellom styrke og løp:
● Mandag: Hvile / Mobilitet.
● Tirsdag: Kvalitetsløp (Intervaller/Terskel).
● Onsdag: Hyrox A (Styrkefokus).
● Torsdag: Restitusjonsløp (Sone 2).
● Fredag: Hyrox B (Metcon/Høy intensitet).
● Lørdag: Aktiv hvile.
● Søndag: Langtur (Progressiv distanse).
2. Database Arkitektur (Firestore Schema)
Collection: users
Lagrer brukerprofil og aktive mål.
JSON
// path: users/{userId}
{
"profile": {
"name": "Bruker Navn",
"hrv_baseline": 65, // Snitt siste 30 dager
"fitness_level": "intermediate"
},
"active_goal": {
"race_name": "Hyrox Oslo",
"race_date": 1718409600, // Timestamp
"race_dist_km": 21.1,
"race_vert_m": 400, // Høydemeter i løypa
"total_weeks": 15
}
}
Sub-collection: workouts
Lagrer genererte økter. Dette er kilden frontend leser fra.
JSON
// path: users/{userId}/workouts/{workoutId}
{
"date": "2024-03-10",
"week_number": 1,
"phase": "base", // base, build, peak, taper
"type": "run", // run, hyrox, rest, strength
"subtype": "long_run",
"completed": false,
"planned": {
"duration_min": 90,
"dist_km": 15,
"vert_m": 200, // Mål for høydemeter (viktig i Build-fase)
"intensity_zone": 2,
"description": "Langtur i prate-tempo."
},
"actual": {
"sRPE": 7, // Oppdateres etter økt (1-10)
"load_score": 630 // sRPE * varighet
},
"is_adjusted": false // True hvis AI har endret økta pga. HRV
}
Sub-collection: metrics
Daglige helsedata for AI-justering.
JSON
// path: users/{userId}/metrics/{dateId}
{
"date": "2024-03-10",
"hrv": 55,
"resting_hr": 48,
"sleep_score": 80
}
3. Algoritme-Logikk (TypeScript)
Dette er filen trainingLogic.ts som håndterer matematikken.
TypeScript
// fil: trainingLogic.ts
export interface RaceGoal {
total_weeks: number;
race_dist_km: number;
race_vert_m: number;
race_date: number;
}
export interface PhaseAllocation {
name: 'base' | 'build' | 'peak' | 'taper';
duration: number;
}
export interface WorkoutPlan {
day: string;
type: 'run' | 'hyrox' | 'rest' | 'strength';
subtype: string;
planned: {
duration_min: number;
dist_km?: number;
vert_m?: number;
intensity_zone: number;
description: string;
};
}
// 1. Beregn Faser
export const calculatePhases = (totalWeeks: number): PhaseAllocation[] => {
// Short Prep Protocol (<12 uker)
if (totalWeeks < 12) {
const base = Math.round(totalWeeks * 0.2);
const build = Math.round(totalWeeks * 0.5);
const peak = Math.round(totalWeeks * 0.2);
const taper = totalWeeks - (base + build + peak);
return [
{ name: 'base', duration: base },
{ name: 'build', duration: build },
{ name: 'peak', duration: peak },
{ name: 'taper', duration: Math.max(1, taper) }
];
}
// Standard Protocol
const base = Math.round(totalWeeks * 0.45);
const build = Math.round(totalWeeks * 0.35);
const peak = Math.round(totalWeeks * 0.10);
const taper = totalWeeks - (base + build + peak);
return [
{ name: 'base', duration: base },
{ name: 'build', duration: build },
{ name: 'peak', duration: peak },
{ name: 'taper', duration: taper }
];
};
// 2. Vertikal Spesifisitet (Race Profiling)
const getVerticalTarget = (distKm: number, goal: RaceGoal): number => {
if (goal.race_dist_km === 0) return 0;
const vertRatio = goal.race_vert_m / goal.race_dist_km;
return Math.round(distKm * vertRatio);
};
// 3. Generer Ukeplan
export const generateWeekJson = (weekNum: number, phase: string, goal: RaceGoal):
WorkoutPlan[] => {
const isDeload = weekNum % 4 === 0; // Hver 4. uke er deload
const volFactor = isDeload ? 0.6 : 1.0;
// Progressiv økning (Start 8km, +10% pr uke)
let rawLongRunDist = 8 * Math.pow(1.1, weekNum - 1);
rawLongRunDist = Math.min(rawLongRunDist, goal.race_dist_km * 1.2);
const longRunDist = Math.round(rawLongRunDist * volFactor);
const easyRunDist = Math.round((longRunDist * 0.5));
const weekPlan: WorkoutPlan[] = [];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
"Sunday"];
days.forEach(day => {
let workout: WorkoutPlan = {
day,
type: 'rest',
subtype: 'recovery',
planned: { duration_min: 0, intensity_zone: 0, description: "Rest Day" }
};
switch (day) {
case "Monday":
workout.planned.description = "Mobilitet eller total hvile.";
break;
case "Tuesday":
workout.type = 'run';
if (phase === 'base') {
workout.subtype = 'intervals_aerobic';
workout.planned = { duration_min: 60, intensity_zone: 3, description: "4 x 8 min
Sone 3." };
} else if (phase === 'build') {
workout.subtype = 'threshold';
workout.planned = { duration_min: 60, intensity_zone: 4, description: "3 x 10
min Terskel." };
} else {
workout.subtype = 'vo2_max';
workout.planned = { duration_min: 50, intensity_zone: 5, description: "10 x
400m maks innsats." };
}
break;
case "Wednesday":
workout.type = 'hyrox';
workout.subtype = 'strength';
workout.planned = { duration_min: 75, intensity_zone: 4, description: "Hyrox
styrkefokus (Sled/Wallballs)." };
break;
case "Thursday":
workout.type = 'run';
workout.subtype = 'easy';
workout.planned = { duration_min: 45, dist_km: easyRunDist, intensity_zone: 2,
description: "Restitusjonsløp Sone 2." };
break;
case "Friday":
if (isDeload) {
workout.type = 'rest';
} else {
workout.type = 'hyrox';
workout.subtype = 'metcon';
workout.planned = { duration_min: 60, intensity_zone: 5, description: "Høy
intensitet sirkel." };
}
break;
case "Sund