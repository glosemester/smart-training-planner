import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'

const wizardSteps = [
  {
    id: 'planType',
    title: 'Type treningsplan',
    question: 'Ønsker du kun plan for løping eller vil du ha full plan?',
    type: 'choice',
    options: [
      {
        value: 'running_only',
        label: 'Kun løping',
        description: 'Jeg trener Hyrox/CrossFit på senter med egne økter',
        icon: '🏃'
      },
      {
        value: 'full_plan',
        label: 'Full plan',
        description: 'Jeg vil ha plan for både løping og styrke/Hyrox/CrossFit',
        icon: '💪'
      }
    ]
  },
  {
    id: 'goal',
    title: 'Ditt mål',
    question: 'Hva er ditt hovedmål?',
    type: 'choice',
    options: [
      { value: 'general_fitness', label: 'Generell form', icon: '🎯' },
      { value: 'race', label: 'Konkurranse (med dato)', icon: '🏆' },
      { value: 'distance', label: 'Løpe lengre distanser', icon: '📏' },
      { value: 'speed', label: 'Bli raskere', icon: '⚡' }
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
    type: 'slider',
    min: 2,
    max: 7,
    default: 4,
    unit: 'dager'
  },
  {
    id: 'preferredDays',
    title: 'Foretrukne dager',
    question: 'Hvilke dager passer best for deg?',
    type: 'multiselect',
    options: [
      { value: 'monday', label: 'Mandag' },
      { value: 'tuesday', label: 'Tirsdag' },
      { value: 'wednesday', label: 'Onsdag' },
      { value: 'thursday', label: 'Torsdag' },
      { value: 'friday', label: 'Fredag' },
      { value: 'saturday', label: 'Lørdag' },
      { value: 'sunday', label: 'Søndag' }
    ]
  },
  {
    id: 'sessionDuration',
    title: 'Tid per økt',
    question: 'Hvor lang tid har du per økt?',
    type: 'choice',
    options: [
      { value: 30, label: '30-45 min', icon: '⏱️' },
      { value: 60, label: '45-75 min', icon: '⏱️' },
      { value: 90, label: '75-90 min', icon: '⏱️' },
      { value: 120, label: '90+ min', icon: '⏱️' }
    ]
  },
  {
    id: 'preferences',
    title: 'Preferanser',
    question: 'Spesielle preferanser? (valgfritt)',
    type: 'textarea',
    placeholder: 'F.eks: Foretrekker morgenløp, unngå intervaller på mandager, etc.',
    optional: true
  }
]

export default function PlanningWizard({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})

  const step = wizardSteps[currentStep]
  const isLastStep = currentStep === wizardSteps.length - 1

  // Sjekk om steget skal vises
  const shouldShowStep = (step) => {
    if (!step.showIf) return true
    return step.showIf(answers)
  }

  // Gå til neste steg
  const handleNext = () => {
    if (isLastStep) {
      onComplete(answers)
    } else {
      // Finn neste synlige steg
      let nextStep = currentStep + 1
      while (nextStep < wizardSteps.length && !shouldShowStep(wizardSteps[nextStep])) {
        nextStep++
      }
      setCurrentStep(nextStep)
    }
  }

  // Gå til forrige steg
  const handleBack = () => {
    let prevStep = currentStep - 1
    while (prevStep >= 0 && !shouldShowStep(wizardSteps[prevStep])) {
      prevStep--
    }
    if (prevStep >= 0) {
      setCurrentStep(prevStep)
    }
  }

  // Oppdater svar
  const updateAnswer = (stepId, value) => {
    setAnswers(prev => ({ ...prev, [stepId]: value }))
  }

  // Sjekk om vi kan gå videre
  const canProceed = () => {
    if (step.optional) return true
    const answer = answers[step.id]
    if (!answer) return false
    if (step.type === 'multiselect') return answer.length > 0
    return true
  }

  // Ikke vis steget hvis showIf returnerer false
  if (!shouldShowStep(step)) {
    handleNext()
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Steg {currentStep + 1} av {wizardSteps.length}</span>
          <span>{Math.round(((currentStep + 1) / wizardSteps.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="card space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
            {step.title}
          </h2>
          <p className="text-text-secondary">
            {step.question}
          </p>
        </div>

        {/* Render based on type */}
        {step.type === 'choice' && (
          <div className="space-y-3">
            {step.options.map(option => (
              <button
                key={option.value}
                onClick={() => updateAnswer(step.id, option.value)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  answers[step.id] === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {option.icon && <span className="text-2xl">{option.icon}</span>}
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{option.label}</p>
                    {option.description && (
                      <p className="text-sm text-text-muted mt-1">{option.description}</p>
                    )}
                  </div>
                  {answers[step.id] === option.value && (
                    <Check size={20} className="text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {step.type === 'multiselect' && (
          <div className="grid grid-cols-2 gap-3">
            {step.options.map(option => {
              const isSelected = answers[step.id]?.includes(option.value)
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    const current = answers[step.id] || []
                    const newValue = isSelected
                      ? current.filter(v => v !== option.value)
                      : [...current, option.value]
                    updateAnswer(step.id, newValue)
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{option.label}</span>
                    {isSelected && <Check size={16} className="text-primary" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step.type === 'slider' && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">
                {answers[step.id] || step.default}
              </span>
              <span className="text-xl text-text-muted ml-2">{step.unit}</span>
            </div>
            <input
              type="range"
              min={step.min}
              max={step.max}
              value={answers[step.id] || step.default}
              onChange={(e) => updateAnswer(step.id, parseInt(e.target.value))}
              className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>{step.min} {step.unit}</span>
              <span>{step.max} {step.unit}</span>
            </div>
          </div>
        )}

        {step.type === 'race_details' && (
          <div className="space-y-4">
            <div>
              <label className="input-label">Konkurransedato</label>
              <input
                type="date"
                value={answers[step.id]?.date || ''}
                onChange={(e) => updateAnswer(step.id, { ...answers[step.id], date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            <div>
              <label className="input-label">Distanse</label>
              <select
                value={answers[step.id]?.distance || ''}
                onChange={(e) => updateAnswer(step.id, { ...answers[step.id], distance: e.target.value })}
                className="input"
              >
                <option value="">Velg distanse</option>
                <option value="5km">5 km</option>
                <option value="10km">10 km</option>
                <option value="half">Halvmaraton (21.1 km)</option>
                <option value="full">Maraton (42.2 km)</option>
                <option value="hyrox">Hyrox</option>
              </select>
            </div>

            <div>
              <label className="input-label">Målsetting (valgfritt)</label>
              <input
                type="text"
                placeholder="F.eks: 45:00 (mm:ss) eller 3:30:00 (tt:mm:ss)"
                value={answers[step.id]?.goalTime || ''}
                onChange={(e) => updateAnswer(step.id, { ...answers[step.id], goalTime: e.target.value })}
                className="input"
              />
            </div>
          </div>
        )}

        {step.type === 'textarea' && (
          <textarea
            value={answers[step.id] || ''}
            onChange={(e) => updateAnswer(step.id, e.target.value)}
            placeholder={step.placeholder}
            rows={4}
            className="input resize-none"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <button onClick={handleBack} className="btn-outline flex-1">
            <ChevronLeft size={20} />
            Tilbake
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-primary flex-1"
        >
          {isLastStep ? 'Generer plan' : 'Neste'}
          {!isLastStep && <ChevronRight size={20} />}
        </button>
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="w-full text-center text-sm text-text-muted hover:text-text-secondary"
      >
        Avbryt
      </button>
    </div>
  )
}
