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

  const shouldShowStep = (step) => {
    if (!step.showIf) return true
    return step.showIf(answers)
  }

  const handleNext = () => {
    if (isLastStep) {
      onComplete(answers)
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

  const updateAnswer = (stepId, value) => {
    setAnswers(prev => ({ ...prev, [stepId]: value }))
  }

  const canProceed = () => {
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

  return (
    <div className="max-w-2xl mx-auto space-y-8" role="dialog" aria-labelledby="wizard-title">
      {/* Progress bar */}
      <div className="space-y-3" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin="1" aria-valuemax={wizardSteps.length}>
        <div className="flex justify-between text-xs text-text-muted font-medium">
          <span>Steg {currentStep + 1} av {wizardSteps.length}</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6">
        <div>
          <h2 id="wizard-title" className="font-heading text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step.title}
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {step.question}
          </p>
        </div>

        {/* Render based on type */}
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

        {step.type === 'multiselect' && (
          <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="wizard-title">
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
                  role="checkbox"
                  aria-checked={isSelected}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${isSelected
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-gray-400'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{option.label}</span>
                    {isSelected && <Check size={18} className="text-primary" aria-hidden="true" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step.type === 'slider' && (
          <div className="card py-8 space-y-6">
            <div className="text-center">
              <span className="text-5xl font-bold text-primary">
                {answers[step.id] || step.default}
              </span>
              <span className="text-xl text-gray-500 ml-2">{step.unit}</span>
            </div>
            <input
              type="range"
              min={step.min}
              max={step.max}
              value={answers[step.id] || step.default}
              onChange={(e) => updateAnswer(step.id, parseInt(e.target.value))}
              className="w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-sm text-gray-500 px-1">
              <span>{step.min} {step.unit}</span>
              <span>{step.max} {step.unit}</span>
            </div>
          </div>
        )}

        {step.type === 'race_details' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="race-date" className="input-label">Konkurransedato</label>
              <input
                id="race-date"
                type="date"
                value={answers[step.id]?.date || ''}
                onChange={(e) => updateAnswer(step.id, { ...answers[step.id], date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="race-distance" className="input-label">Distanse</label>
              <select
                id="race-distance"
                value={answers[step.id]?.distance || ''}
                onChange={(e) => updateAnswer(step.id, { ...answers[step.id], distance: e.target.value })}
                className="input"
              >
                <option value="">Velg distanse</option>
                <option value="5km">5 km</option>
                <option value="10km">10 km</option>
                <option value="half">Halvmaraton (21.1 km)</option>
                <option value="full">Maraton (42.2 km)</option>
                <option value="50km">Ultramaraton 50 km</option>
                <option value="65km">Ultramaraton 65 km</option>
                <option value="100km">Ultramaraton 100 km</option>
                <option value="hyrox">Hyrox</option>
                <option value="custom">Annen distanse</option>
              </select>
            </div>

            {answers[step.id]?.distance === 'custom' && (
              <div>
                <label htmlFor="custom-distance" className="input-label">Spesifiser distanse (km)</label>
                <input
                  id="custom-distance"
                  type="number"
                  step="0.1"
                  min="1"
                  placeholder="F.eks: 80"
                  value={answers[step.id]?.customDistance || ''}
                  onChange={(e) => updateAnswer(step.id, { ...answers[step.id], customDistance: e.target.value })}
                  className="input"
                />
              </div>
            )}

            <div>
              <label htmlFor="race-goal-time" className="input-label">Målsetting (valgfritt)</label>
              <input
                id="race-goal-time"
                type="text"
                placeholder="F.eks: 45:00"
                value={answers[step.id]?.goalTime || ''}
                onChange={(e) => updateAnswer(step.id, { ...answers[step.id], goalTime: e.target.value })}
                className="input"
              />
            </div>
          </div>
        )}

        {step.type === 'textarea' && (
          <textarea
            id={`wizard-${step.id}`}
            value={answers[step.id] || ''}
            onChange={(e) => updateAnswer(step.id, e.target.value)}
            placeholder={step.placeholder}
            rows={4}
            className="input resize-none"
          />
        )}
      </div>

      {/* Navigation */}
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
          {isLastStep ? 'Generer plan' : 'Neste'}
          {!isLastStep && <ChevronRight size={20} />}
        </button>
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        Avbryt
      </button>
    </div>
  )
}
