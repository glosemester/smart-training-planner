// Treningstyper og deres egenskaper

export const WORKOUT_TYPES = {
  // Løping
  easy_run: {
    id: 'easy_run',
    name: 'Rolig løp',
    category: 'running',
    color: '#ff6b35',
    icon: '🏃',
    description: 'Lav intensitet, puls i sone 1-2'
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo/Terskel',
    category: 'running',
    color: '#ff8c5a',
    icon: '🏃‍♂️',
    description: 'Moderat-høy intensitet, puls i sone 3-4'
  },
  interval: {
    id: 'interval',
    name: 'Intervall',
    category: 'running',
    color: '#ef476f',
    icon: '⚡',
    description: 'Høy intensitet med pauser'
  },
  long_run: {
    id: 'long_run',
    name: 'Langtur',
    category: 'running',
    color: '#06d6a0',
    icon: '🏔️',
    description: 'Lang løpetur i rolig tempo'
  },
  recovery_run: {
    id: 'recovery_run',
    name: 'Restitusjon',
    category: 'running',
    color: '#6c757d',
    icon: '🚶',
    description: 'Veldig rolig løp for restitusjon'
  },

  // Styrke
  hyrox: {
    id: 'hyrox',
    name: 'Hyrox',
    category: 'strength',
    color: '#8b5cf6',
    icon: '💪',
    description: 'Hyrox-spesifikk trening'
  },
  crossfit: {
    id: 'crossfit',
    name: 'CrossFit',
    category: 'strength',
    color: '#10b981',
    icon: '🏋️',
    description: 'CrossFit WOD'
  },
  strength: {
    id: 'strength',
    name: 'Styrke',
    category: 'strength',
    color: '#4361ee',
    icon: '🏋️‍♂️',
    description: 'Generell styrketrening'
  },

  // Andre
  cycling: {
    id: 'cycling',
    name: 'Sykling',
    category: 'cardio',
    color: '#ffd166',
    icon: '🚴',
    description: 'Sykkeltur'
  },
  swimming: {
    id: 'swimming',
    name: 'Svømming',
    category: 'cardio',
    color: '#4cc9f0',
    icon: '🏊',
    description: 'Svømming'
  },
  rest: {
    id: 'rest',
    name: 'Hviledag',
    category: 'rest',
    color: '#6c757d',
    icon: '😴',
    description: 'Full hvile'
  },
  recovery: {
    id: 'recovery',
    name: 'Aktiv restitusjon',
    category: 'rest',
    color: '#adb5bd',
    icon: '🧘',
    description: 'Lett aktivitet, yoga, tøying'
  },
  other: {
    id: 'other',
    name: 'Annet',
    category: 'other',
    color: '#adb5bd',
    icon: '🎯',
    description: 'Annen aktivitet'
  }
}

// Kategorier
export const WORKOUT_CATEGORIES = {
  running: {
    id: 'running',
    name: 'Løping',
    color: '#ff6b35'
  },
  strength: {
    id: 'strength',
    name: 'Styrke',
    color: '#4361ee'
  },
  cardio: {
    id: 'cardio',
    name: 'Kondisjon',
    color: '#ffd166'
  },
  rest: {
    id: 'rest',
    name: 'Hvile',
    color: '#6c757d'
  },
  other: {
    id: 'other',
    name: 'Annet',
    color: '#adb5bd'
  }
}

// Hent type info
export function getWorkoutType(typeId) {
  return WORKOUT_TYPES[typeId] || WORKOUT_TYPES.other
}

// Hent alle løpetyper
export function getRunningTypes() {
  return Object.values(WORKOUT_TYPES).filter(t => t.category === 'running')
}

// Hent alle styrketyper
export function getStrengthTypes() {
  return Object.values(WORKOUT_TYPES).filter(t => t.category === 'strength')
}

// RPE skala
export const RPE_SCALE = [
  { value: 1, label: '1 - Veldig lett', description: 'Kan synge' },
  { value: 2, label: '2 - Lett', description: 'Lett samtale' },
  { value: 3, label: '3 - Moderat lett', description: 'Komfortabel samtale' },
  { value: 4, label: '4 - Moderat', description: 'Kan snakke i setninger' },
  { value: 5, label: '5 - Moderat hard', description: 'Kortere setninger' },
  { value: 6, label: '6 - Hard', description: 'Få ord av gangen' },
  { value: 7, label: '7 - Veldig hard', description: 'Vanskelig å snakke' },
  { value: 8, label: '8 - Ekstremt hard', description: 'Kun enkeltord' },
  { value: 9, label: '9 - Nesten maks', description: 'Kan ikke snakke' },
  { value: 10, label: '10 - Maksimal', description: 'All-out innsats' }
]

// Underlag for løping
export const RUNNING_SURFACES = [
  { id: 'road', name: 'Asfalt/vei', icon: '🛣️' },
  { id: 'trail', name: 'Sti/terreng', icon: '🌲' },
  { id: 'track', name: 'Bane', icon: '🏟️' },
  { id: 'treadmill', name: 'Tredemølle', icon: '🏃' },
  { id: 'gravel', name: 'Grus', icon: '🪨' },
  { id: 'mixed', name: 'Blandet', icon: '🔀' }
]

export default WORKOUT_TYPES
