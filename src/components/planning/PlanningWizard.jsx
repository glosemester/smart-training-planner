import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Check, Link2, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { checkStravaConnection, getStravaHistoryAnalysis } from '../../services/stravaHistoryService'
import { connectToStrava } from '../../services/stravaService'
import StravaHistoryCard from './StravaHistoryCard'
import SummaryStep from './SummaryStep'

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
  {
    id: 'availability',
    title: 'Tilgjengelighet',
    question: 'Hvor mange dager kan du trene per uke?',
    type: 'availability_combined'
  },
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
    daysPerWeek: 4,
    availableDays: [],
    preferredTime: 'flexible'
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
          // Hent historikk automatisk
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
      // Ferdig - kall onComplete
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

    // Bygg userData-objektet med Strava-historikk
    const userData = {
      ...answers,
      goal: answers.raceDetails ? {
        type: 'race',
        ...answers.raceDetails
      } : {
        type: answers.goal
      },
      stravaHistory: stravaAnalysis
    }

    onComplete(userData)
  }

  const canProceed = () => {
    // Strava gate - må være tilkoblet
    if (step.type === 'strava_gate') {
      return stravaConnected && !stravaLoading
    }

    // Strava historikk - alltid OK (bare visning)
    if (step.type === 'strava_history') {
      return true
    }

    // Summary - alltid OK
    if (step.type === 'summary') {
      return true
    }

    // Availability combined
    if (step.type === 'availability_combined') {
      return answers.daysPerWeek > 0 && answers.availableDays?.length > 0
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

        {/* AVAILABILITY COMBINED */}
        {step.type === 'availability_combined' && (
          <div className="space-y-6">
            {/* Dager per uke slider */}
            <div className="card py-6 space-y-4">
              <label className="input-label">Antall treningsdager per uke</label>
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">
                  {answers.daysPerWeek || 4}
                </span>
                <span className="text-xl text-gray-500 ml-2">dager</span>
              </div>
              <input
                type="range"
                min={2}
                max={7}
                value={answers.daysPerWeek || 4}
                onChange={(e) => updateAnswer('daysPerWeek', parseInt(e.target.value))}
                className="w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-sm text-gray-500 px-1">
                <span>2 dager</span>
                <span>7 dager</span>
              </div>
            </div>

            {/* Foretrukne dager */}
            <div>
              <label className="input-label mb-3 block">Hvilke dager passer best?</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {[
                  { value: 'monday', label: 'Man' },
                  { value: 'tuesday', label: 'Tir' },
                  { value: 'wednesday', label: 'Ons' },
                  { value: 'thursday', label: 'Tor' },
                  { value: 'friday', label: 'Fre' },
                  { value: 'saturday', label: 'Lør' },
                  { value: 'sunday', label: 'Søn' }
                ].map(day => {
                  const isSelected = answers.availableDays?.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => {
                        const current = answers.availableDays || []
                        const newValue = isSelected
                          ? current.filter(v => v !== day.value)
                          : [...current, day.value]
                        updateAnswer('availableDays', newValue)
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${isSelected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tidspunkt på dagen */}
            <div>
              <label className="input-label mb-3 block">Når trener du helst?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'morning', label: 'Morgen', icon: '🌅', desc: 'Før jobb' },
                  { value: 'lunch', label: 'Lunsj', icon: '☀️', desc: 'Midt på dagen' },
                  { value: 'evening', label: 'Kveld', icon: '🌙', desc: 'Etter jobb' },
                  { value: 'flexible', label: 'Fleksibel', icon: '🔄', desc: 'Varierer' }
                ].map(time => {
                  const isSelected = answers.preferredTime === time.value
                  return (
                    <button
                      key={time.value}
                      onClick={() => updateAnswer('preferredTime', time.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{time.icon}</span>
                        <div>
                          <p className={`font-medium ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                            {time.label}
                          </p>
                          <p className="text-xs text-gray-500">{time.desc}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* SESSION DETAILS */}
        {step.type === 'session_details' && (
          <div className="space-y-6">
            {/* Øktlengde */}
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
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                        }`}
                    >
                      <p className={`font-bold text-lg ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                        {duration.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{duration.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preferanser */}
            <div>
              <label htmlFor="preferences" className="input-label">
                Andre preferanser eller begrensninger? (valgfritt)
              </label>
              <textarea
                id="preferences"
                value={answers.preferences || ''}
                onChange={(e) => updateAnswer('preferences', e.target.value)}
                placeholder="F.eks: Foretrekker terrengloping, har kneproblemer, unngå intervaller på mandager..."
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
          />
        )}
      </div>

      {/* Navigation - ikke vis for summary (har egen knapp) */}
      {step.type !== 'summary' && (
        <>
          <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
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

          {/* Cancel */}
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
