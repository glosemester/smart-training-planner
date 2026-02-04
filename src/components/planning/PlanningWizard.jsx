import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Check, Link2, AlertCircle, Loader2, Ban } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { checkStravaConnection, getStravaHistoryAnalysis } from '../../services/stravaHistoryService'
import { connectToStrava } from '../../services/stravaService'
import StravaHistoryCard from './StravaHistoryCard'
import SummaryStep from './SummaryStep'

const DAYS = [
  { value: 'monday', label: 'Man', fullLabel: 'Mandag' },
  { value: 'tuesday', label: 'Tir', fullLabel: 'Tirsdag' },
  { value: 'wednesday', label: 'Ons', fullLabel: 'Onsdag' },
  { value: 'thursday', label: 'Tor', fullLabel: 'Torsdag' },
  { value: 'friday', label: 'Fre', fullLabel: 'Fredag' },
  { value: 'saturday', label: 'Lør', fullLabel: 'Lørdag' },
  { value: 'sunday', label: 'Søn', fullLabel: 'Søndag' }
]

const wizardSteps = [
  {
    id: 'stravaConnect',
    title: 'Koble til Strava',
    question: 'For å lage en tilpasset plan trenger vi tilgang til din treningshistorikk',
    type: 'strava_gate'
  },
  {
    id: 'stravaHistory',
    title: 'Din treningshistorikk',
    question: 'Her er et sammendrag av dine siste 4 uker',
    type: 'strava_history'
  },
  {
    id: 'goal',
    title: 'Ditt mål',
    question: 'Hva er ditt hovedmål?',
    type: 'choice',
    options: [
      { value: 'general_fitness', label: 'Generell form', description: 'Holde meg i form uten spesifikt mål', icon: '🎯' },
      { value: 'race', label: 'Konkurranse', description: 'Trene mot en spesifikk konkurranse', icon: '🏆' },
      { value: 'distance', label: 'Lengre distanser', description: 'Bygge opp til å løpe lenger', icon: '📏' },
      { value: 'speed', label: 'Bli raskere', description: 'Forbedre hastighet og tempo', icon: '⚡' }
    ]
  },
  {
    id: 'raceDetails',
    title: 'Konkurransedetaljer',
    question: 'Fortell oss om konkurransen',
    type: 'race_details',
    showIf: (answers) => answers.goal === 'race'
  },
  // ========== NYE STEG ==========
  {
    id: 'trainingType',
    title: 'Type trening',
    question: 'Hva slags trening skal planen inneholde?',
    type: 'training_type'
  },
  {
    id: 'sessionsPerWeek',
    title: 'Antall økter',
    question: 'Hvor mange økter vil du trene per uke?',
    type: 'sessions_slider'
  },
  {
    id: 'daySelection',
    title: 'Velg treningsdager',
    question: 'Hvilke dager kan du trene?',
    type: 'day_picker_advanced'
  },
  {
    id: 'startVolume',
    title: 'Startvolum',
    question: 'Hvor mye trener du per uke nå?',
    type: 'volume_input'
  },
  // ==============================
  {
    id: 'sessionDuration',
    title: 'Treningsøkter',
    question: 'Detaljer om øktene dine',
    type: 'session_details'
  },
  {
    id: 'summary',
    title: 'Bekreft dine valg',
    question: 'Sjekk at alt ser riktig ut',
    type: 'summary'
  }
]

export default function PlanningWizard({ onComplete, onCancel }) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({
    // Eksisterende
    daysPerWeek: 4,
    availableDays: [],
    preferredTime: 'flexible',
    // Nye felter
    trainingType: null,          // 'running_only' | 'hyrox_hybrid'
    sessionsPerWeek: 4,          // 2-7
    blockedDays: [],             // Dager som ALDRI skal ha trening
    startVolume: {               // Startvolum
      mode: 'strava',            // 'strava' | 'manual' | 'beginner'
      kmPerWeek: null,
      hoursPerWeek: null
    }
  })

  // Strava state
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaLoading, setStravaLoading] = useState(true)
  const [stravaAnalysis, setStravaAnalysis] = useState(null)
  const [stravaError, setStravaError] = useState(null)

  // Generering state
  const [isGenerating, setIsGenerating] = useState(false)

  // Sjekk Strava-tilkobling ved oppstart
  useEffect(() => {
    async function checkStrava() {
      if (!user?.uid) return

      setStravaLoading(true)
      try {
        const status = await checkStravaConnection(user.uid)
        setStravaConnected(status.connected)

        if (status.connected) {
          const historyResult = await getStravaHistoryAnalysis(user.uid, 4)
          if (historyResult.success) {
            setStravaAnalysis(historyResult.analysis)
          } else {
            setStravaError(historyResult.error)
          }
        }
      } catch (err) {
        console.error('Error checking Strava:', err)
        setStravaError(err.message)
      } finally {
        setStravaLoading(false)
      }
    }

    checkStrava()
  }, [user?.uid])

  const step = wizardSteps[currentStep]
  const isLastStep = currentStep === wizardSteps.length - 1

  const shouldShowStep = (step) => {
    if (!step.showIf) return true
    return step.showIf(answers)
  }

  const getVisibleSteps = () => {
    return wizardSteps.filter(s => shouldShowStep(s))
  }

  const getCurrentVisibleIndex = () => {
    const visibleSteps = getVisibleSteps()
    return visibleSteps.findIndex(s => s.id === step.id)
  }

  const handleNext = () => {
    if (isLastStep || step.type === 'summary') {
      handleGenerate()
    } else {
      let nextStep = currentStep + 1
      while (nextStep < wizardSteps.length && !shouldShowStep(wizardSteps[nextStep])) {
        nextStep++
      }
      setCurrentStep(nextStep)
    }
  }

  const handleBack = () => {
    let prevStep = currentStep - 1
    while (prevStep >= 0 && !shouldShowStep(wizardSteps[prevStep])) {
      prevStep--
    }
    if (prevStep >= 0) {
      setCurrentStep(prevStep)
    }
  }

  const handleEditStep = (stepIndex) => {
    setCurrentStep(stepIndex)
  }

  const updateAnswer = (stepId, value) => {
    setAnswers(prev => ({ ...prev, [stepId]: value }))
  }

  const handleGenerate = () => {
    setIsGenerating(true)

    // Beregn startvolum basert på modus
    let calculatedStartVolume = answers.startVolume
    if (answers.startVolume.mode === 'strava' && stravaAnalysis) {
      calculatedStartVolume = {
        ...calculatedStartVolume,
        kmPerWeek: stravaAnalysis.weeklyAvgKm,
        hoursPerWeek: stravaAnalysis.avgWeeklyHours || Math.round(stravaAnalysis.weeklyAvgKm / 10)
      }
    } else if (answers.startVolume.mode === 'beginner') {
      calculatedStartVolume = {
        ...calculatedStartVolume,
        kmPerWeek: 15,
        hoursPerWeek: 3
      }
    }

    // Bygg userData-objektet med alle nye felter
    const userData = {
      ...answers,
      goal: answers.raceDetails ? {
        type: 'race',
        ...answers.raceDetails
      } : {
        type: answers.goal
      },
      // Eksplisitt inkluder nye felter for backend
      trainingType: answers.trainingType,
      sessionsPerWeek: answers.sessionsPerWeek,
      blockedDays: answers.blockedDays,
      startVolume: calculatedStartVolume,
      stravaHistory: stravaAnalysis
    }

    onComplete(userData)
  }

  const canProceed = () => {
    // Strava gate
    if (step.type === 'strava_gate') {
      return stravaConnected && !stravaLoading
    }

    // Strava historikk
    if (step.type === 'strava_history') {
      return true
    }

    // Summary
    if (step.type === 'summary') {
      return true
    }

    // Training type - må velge en
    if (step.type === 'training_type') {
      return !!answers.trainingType
    }

    // Sessions slider - alltid OK (har default)
    if (step.type === 'sessions_slider') {
      return answers.sessionsPerWeek >= 2 && answers.sessionsPerWeek <= 7
    }

    // Day picker advanced - må ha nok tilgjengelige dager
    if (step.type === 'day_picker_advanced') {
      const effectiveDays = answers.availableDays?.filter(d => !answers.blockedDays?.includes(d)) || []
      return effectiveDays.length >= answers.sessionsPerWeek
    }

    // Volume input - alltid OK (har default modus)
    if (step.type === 'volume_input') {
      if (answers.startVolume.mode === 'manual') {
        return answers.startVolume.kmPerWeek > 0 || answers.startVolume.hoursPerWeek > 0
      }
      return true
    }

    // Session details
    if (step.type === 'session_details') {
      return !!answers.maxSessionDuration
    }

    // Standard logikk
    if (step.optional) return true
    const answer = answers[step.id]
    if (!answer) return false
    if (step.type === 'multiselect') return answer.length > 0
    if (step.type === 'race_details') {
      if (!answer.date || !answer.distance) return false
      if (answer.distance === 'custom' && !answer.customDistance) return false
    }
    return true
  }

  if (!shouldShowStep(step)) {
    handleNext()
    return null
  }

  const visibleSteps = getVisibleSteps()
  const currentVisibleIndex = getCurrentVisibleIndex()

  // Beregn effektive treningsdager (tilgjengelige minus blokkerte)
  const effectiveTrainingDays = answers.availableDays?.filter(d => !answers.blockedDays?.includes(d)) || []

  return (
    <div className="max-w-2xl mx-auto space-y-8" role="dialog" aria-labelledby="wizard-title">
      {/* Progress bar */}
      <div className="space-y-3" role="progressbar" aria-valuenow={currentVisibleIndex + 1} aria-valuemin="1" aria-valuemax={visibleSteps.length}>
        <div className="flex justify-between text-xs text-text-muted font-medium">
          <span>Steg {currentVisibleIndex + 1} av {visibleSteps.length}</span>
          {step.type !== 'strava_gate' && step.type !== 'summary' && (
            <span className="text-gray-400">~2 min igjen</span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((currentVisibleIndex + 1) / visibleSteps.length) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6">
        {step.type !== 'summary' && (
          <div>
            <h2 id="wizard-title" className="font-heading text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              {step.question}
            </p>
          </div>
        )}

        {/* STRAVA GATE */}
        {step.type === 'strava_gate' && (
          <div className="space-y-6">
            {stravaLoading ? (
              <div className="card p-8 text-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Sjekker Strava-tilkobling...</p>
              </div>
            ) : stravaConnected ? (
              <div className="card p-8 text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
                  Strava er klar!
                </h3>
                <p className="text-green-600 dark:text-green-400">
                  Vi har tilgang til din treningshistorikk
                </p>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg"
                    alt="Strava"
                    className="w-12 h-12"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'block'
                    }}
                  />
                  <Link2 className="w-10 h-10 text-orange-500 hidden" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Koble til Strava
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Vi analyserer historikken din for å finne ditt nivå.
                </p>

                <button
                  onClick={() => connectToStrava()}
                  className="btn-primary bg-[#FC4C02] hover:bg-[#E34402] border-none px-8 py-3 text-lg"
                >
                  <Link2 className="w-5 h-5 mr-2" />
                  Koble til Strava
                </button>

                {stravaError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{stravaError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STRAVA HISTORY */}
        {step.type === 'strava_history' && (
          <div className="space-y-4">
            <StravaHistoryCard analysis={stravaAnalysis} loading={stravaLoading} />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Vi bruker denne dataen til å lage en realistisk plan tilpasset ditt nivå.
            </p>
          </div>
        )}

        {/* CHOICE */}
        {step.type === 'choice' && (
          <div className="space-y-3" role="radiogroup" aria-labelledby="wizard-title">
            {step.options.map(option => (
              <button
                key={option.value}
                onClick={() => updateAnswer(step.id, option.value)}
                role="radio"
                aria-checked={answers[step.id] === option.value}
                className={`w-full p-6 rounded-2xl border text-left transition-all duration-200 group ${answers[step.id] === option.value
                  ? 'border-primary bg-primary/5 shadow-inner'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
              >
                <div className="flex items-start gap-4">
                  {option.icon && <span className="text-3xl" aria-hidden="true">{option.icon}</span>}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-lg ${answers[step.id] === option.value ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                        {option.label}
                      </p>
                      {answers[step.id] === option.value && (
                        <Check size={20} className="text-primary flex-shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* RACE DETAILS */}
        {step.type === 'race_details' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="race-date" className="input-label">Konkurransedato</label>
              <input
                id="race-date"
                type="date"
                value={answers.raceDetails?.date || ''}
                onChange={(e) => updateAnswer('raceDetails', { ...answers.raceDetails, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="race-distance" className="input-label">Distanse</label>
              <select
                id="race-distance"
                value={answers.raceDetails?.distance || ''}
                onChange={(e) => updateAnswer('raceDetails', { ...answers.raceDetails, distance: e.target.value })}
                className="input"
              >
                <option value="">Velg distanse</option>
                <option value="5k">5 km</option>
                <option value="10k">10 km</option>
                <option value="half_marathon">Halvmaraton (21.1 km)</option>
                <option value="marathon">Maraton (42.2 km)</option>
                <option value="50k">Ultramaraton 50 km</option>
                <option value="65k">Ultramaraton 65 km</option>
                <option value="100k">Ultramaraton 100 km</option>
                <option value="hyrox">Hyrox</option>
                <option value="custom">Annen distanse</option>
              </select>
            </div>

            {answers.raceDetails?.distance === 'custom' && (
              <div>
                <label htmlFor="custom-distance" className="input-label">Spesifiser distanse (km)</label>
                <input
                  id="custom-distance"
                  type="number"
                  step="0.1"
                  min="1"
                  placeholder="F.eks: 80"
                  value={answers.raceDetails?.customDistance || ''}
                  onChange={(e) => updateAnswer('raceDetails', { ...answers.raceDetails, customDistance: e.target.value })}
                  className="input"
                />
              </div>
            )}

            <div>
              <label htmlFor="race-goal-time" className="input-label">Måltid (valgfritt)</label>
              <input
                id="race-goal-time"
                type="text"
                placeholder="F.eks: 4:30:00"
                value={answers.raceDetails?.targetTime || ''}
                onChange={(e) => updateAnswer('raceDetails', { ...answers.raceDetails, targetTime: e.target.value })}
                className="input"
              />
            </div>
          </div>
        )}

        {/* ========== NYE STEG ========== */}

        {/* TRAINING TYPE */}
        {step.type === 'training_type' && (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => updateAnswer('trainingType', 'running_only')}
              className={`p-6 rounded-2xl border text-left transition-all duration-300 ${answers.trainingType === 'running_only'
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">🏃</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-xl ${answers.trainingType === 'running_only' ? 'text-primary' : 'text-white'}`}>
                      Kun løping
                    </h3>
                    {answers.trainingType === 'running_only' && <Check size={20} className="text-primary" />}
                  </div>
                  <p className="text-text-muted text-sm mt-1">
                    Bare løpeøkter - ingen styrke eller Hyrox
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => updateAnswer('trainingType', 'hyrox_hybrid')}
              className={`p-6 rounded-2xl border text-left transition-all duration-300 ${answers.trainingType === 'hyrox_hybrid'
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">💪</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-xl ${answers.trainingType === 'hyrox_hybrid' ? 'text-primary' : 'text-white'}`}>
                      Hyrox / Hybrid
                    </h3>
                    {answers.trainingType === 'hyrox_hybrid' && <Check size={20} className="text-primary" />}
                  </div>
                  <p className="text-text-muted text-sm mt-1">
                    Løping + styrkeøkter + Hyrox-spesifikk trening
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* SESSIONS SLIDER */}
        {step.type === 'sessions_slider' && (
          <div className="space-y-6">
            <div className="card py-8 space-y-6">
              <div className="text-center">
                <span className="text-6xl font-bold text-primary">
                  {answers.sessionsPerWeek}
                </span>
                <span className="text-2xl text-gray-500 ml-2">økter/uke</span>
              </div>

              <input
                type="range"
                min={2}
                max={7}
                value={answers.sessionsPerWeek}
                onChange={(e) => updateAnswer('sessionsPerWeek', parseInt(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
              />

              <div className="flex justify-between text-sm text-gray-500 px-1">
                <span>2 økter</span>
                <span>7 økter</span>
              </div>
            </div>

            {stravaAnalysis && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary">
                  💡 Basert på Strava-historikken din anbefaler vi <strong>{Math.round(stravaAnalysis.weeklyAvgKm / 8)}-{Math.round(stravaAnalysis.weeklyAvgKm / 6)} økter</strong> per uke.
                </p>
              </div>
            )}
          </div>
        )}

        {/* DAY PICKER ADVANCED */}
        {step.type === 'day_picker_advanced' && (
          <div className="space-y-8">
            {/* Tilgjengelige dager */}
            <div>
              <label className="input-label mb-3 block">
                Velg treningsdager <span className="text-primary">(minst {answers.sessionsPerWeek})</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAYS.map(day => {
                  const isSelected = answers.availableDays?.includes(day.value)
                  const isBlocked = answers.blockedDays?.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => {
                        if (isBlocked) return // Kan ikke velge blokkert dag
                        const current = answers.availableDays || []
                        const newValue = isSelected
                          ? current.filter(v => v !== day.value)
                          : [...current, day.value]
                        updateAnswer('availableDays', newValue)
                      }}
                      disabled={isBlocked}
                      className={`p-3 rounded-xl border text-center transition-all ${isBlocked
                        ? 'opacity-30 cursor-not-allowed bg-red-500/10 border-red-500/20'
                        : isSelected
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Blokkerte dager */}
            <div>
              <label className="input-label mb-3 block flex items-center gap-2">
                <Ban size={16} className="text-red-400" />
                Blokkerte dager <span className="text-text-muted">(aldri trening)</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAYS.map(day => {
                  const isBlocked = answers.blockedDays?.includes(day.value)
                  const isAvailable = answers.availableDays?.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => {
                        const current = answers.blockedDays || []
                        const newValue = isBlocked
                          ? current.filter(v => v !== day.value)
                          : [...current, day.value]
                        updateAnswer('blockedDays', newValue)
                        // Fjern fra availableDays hvis vi blokkerer
                        if (!isBlocked && isAvailable) {
                          updateAnswer('availableDays', answers.availableDays.filter(v => v !== day.value))
                        }
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${isBlocked
                        ? 'border-red-500 bg-red-500/20 text-red-400 font-bold'
                        : 'border-white/10 text-gray-400 hover:border-red-500/50 hover:text-red-400'
                        }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Validering */}
            {effectiveTrainingDays.length < answers.sessionsPerWeek && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Du trenger minst {answers.sessionsPerWeek} tilgjengelige dager! (har {effectiveTrainingDays.length})
                </p>
              </div>
            )}

            {effectiveTrainingDays.length >= answers.sessionsPerWeek && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400">
                  ✅ {answers.sessionsPerWeek} økter vil bli lagt på: <strong>{effectiveTrainingDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* VOLUME INPUT */}
        {step.type === 'volume_input' && (
          <div className="space-y-4">
            {/* Strava-basert (anbefalt) */}
            {stravaAnalysis && (
              <button
                onClick={() => updateAnswer('startVolume', { ...answers.startVolume, mode: 'strava' })}
                className={`w-full p-6 rounded-2xl border text-left transition-all ${answers.startVolume.mode === 'strava'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/20'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">📊</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${answers.startVolume.mode === 'strava' ? 'text-primary' : 'text-white'}`}>
                        Basert på Strava
                      </h3>
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">Anbefalt</span>
                      {answers.startVolume.mode === 'strava' && <Check size={18} className="text-primary" />}
                    </div>
                    <p className="text-text-muted text-sm mt-1">
                      Siste 4 uker: <strong>{stravaAnalysis.weeklyAvgKm} km</strong>/uke, {stravaAnalysis.avgWeeklyHours || Math.round(stravaAnalysis.weeklyAvgKm / 10)}t totalt
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Manuell input */}
            <button
              onClick={() => updateAnswer('startVolume', { ...answers.startVolume, mode: 'manual' })}
              className={`w-full p-6 rounded-2xl border text-left transition-all ${answers.startVolume.mode === 'manual'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
                }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">🔢</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${answers.startVolume.mode === 'manual' ? 'text-primary' : 'text-white'}`}>
                      Jeg velger selv
                    </h3>
                    {answers.startVolume.mode === 'manual' && <Check size={18} className="text-primary" />}
                  </div>
                  <p className="text-text-muted text-sm mt-1">
                    Angi ditt nåværende treningsvolum manuelt
                  </p>
                </div>
              </div>
            </button>

            {/* Manuell input felter */}
            {answers.startVolume.mode === 'manual' && (
              <div className="grid grid-cols-2 gap-4 pl-16 animate-fade-in-up">
                <div>
                  <label className="input-label">Løping (km/uke)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="25"
                    value={answers.startVolume.kmPerWeek || ''}
                    onChange={(e) => updateAnswer('startVolume', { ...answers.startVolume, kmPerWeek: parseFloat(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="input-label">Timer/uke</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="4"
                    value={answers.startVolume.hoursPerWeek || ''}
                    onChange={(e) => updateAnswer('startVolume', { ...answers.startVolume, hoursPerWeek: parseFloat(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
            )}

            {/* Beginner */}
            <button
              onClick={() => updateAnswer('startVolume', { ...answers.startVolume, mode: 'beginner' })}
              className={`w-full p-6 rounded-2xl border text-left transition-all ${answers.startVolume.mode === 'beginner'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
                }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">🚀</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${answers.startVolume.mode === 'beginner' ? 'text-primary' : 'text-white'}`}>
                      Bygg fra scratch
                    </h3>
                    {answers.startVolume.mode === 'beginner' && <Check size={18} className="text-primary" />}
                  </div>
                  <p className="text-text-muted text-sm mt-1">
                    Start forsiktig med 15 km / 3 timer per uke
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* =============================== */}

        {/* SESSION DETAILS (eksisterende, forenklet) */}
        {step.type === 'session_details' && (
          <div className="space-y-6">
            <div>
              <label className="input-label mb-3 block">Hvor lang tid har du per økt?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '30-45', label: '30-45 min', desc: 'Korte økter' },
                  { value: '45-75', label: '45-75 min', desc: 'Standard økter' },
                  { value: '75-90', label: '75-90 min', desc: 'Lengre økter' },
                  { value: '90+', label: '90+ min', desc: 'Lange økter' }
                ].map(duration => {
                  const isSelected = answers.maxSessionDuration === duration.value
                  return (
                    <button
                      key={duration.value}
                      onClick={() => updateAnswer('maxSessionDuration', duration.value)}
                      className={`p-4 rounded-xl border text-center transition-all ${isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-white/10 hover:border-white/20'
                        }`}
                    >
                      <p className={`font-bold text-lg ${isSelected ? 'text-primary' : 'text-white'}`}>
                        {duration.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{duration.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="preferences" className="input-label">
                Andre preferanser? (valgfritt)
              </label>
              <textarea
                id="preferences"
                value={answers.preferences || ''}
                onChange={(e) => updateAnswer('preferences', e.target.value)}
                placeholder="F.eks: Foretrekker terrengloping, har kneproblemer..."
                rows={3}
                className="input resize-none"
              />
            </div>
          </div>
        )}

        {/* SUMMARY */}
        {step.type === 'summary' && (
          <SummaryStep
            answers={answers}
            stravaAnalysis={stravaAnalysis}
            onEditStep={handleEditStep}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            wizardSteps={wizardSteps}
          />
        )}
      </div>

      {/* Navigation */}
      {step.type !== 'summary' && (
        <>
          <div className="flex gap-4 pt-4 border-t border-white/5">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="btn-ghost"
              >
                <ChevronLeft size={20} />
                Tilbake
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary flex-1 shadow-lg shadow-primary/20"
            >
              Neste
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={onCancel}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Avbryt
          </button>
        </>
      )}
    </div>
  )
}
