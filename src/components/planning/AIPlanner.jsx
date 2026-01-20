import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { generateTrainingPlan } from '../../services/aiService'
import { getWorkoutType } from '../../data/workoutTypes'
import { Brain, Sparkles, RefreshCw, Check, Clock, MapPin } from 'lucide-react'
import PlanningWizard from './PlanningWizard'

export default function AIPlanner() {
  const { userProfile } = useAuth()
  const { workouts, currentPlan, savePlan } = useWorkouts()
  const [showWizard, setShowWizard] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState('')
  const [error, setError] = useState(null)
  const [generatedPlan, setGeneratedPlan] = useState(null)

  const handleStartWizard = () => {
    setShowWizard(true)
    setError(null)
  }

  const handleWizardComplete = async (wizardAnswers) => {
    setShowWizard(false)
    setGenerating(true)
    setGeneratingStep('Analyserer treningshistorikk...')
    setError(null)

    try {
      // Forbered data for AI med wizard-svar
      const userData = {
        // Wizard-preferanser
        planType: wizardAnswers.planType || 'full_plan',
        goal: wizardAnswers.goal === 'race' ? {
          type: 'race',
          ...wizardAnswers.raceDetails
        } : {
          type: wizardAnswers.goal
        },
        availableDays: wizardAnswers.preferredDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        daysPerWeek: wizardAnswers.availability || 4,
        maxSessionDuration: wizardAnswers.sessionDuration || 60,
        preferences: wizardAnswers.preferences || '',

        // Eksisterende data
        recentWorkouts: workouts.slice(0, 20).map(w => ({
          date: w.date,
          type: w.type,
          duration: w.duration,
          distance: w.running?.distance,
          rpe: w.rpe
        })),
        health: {
          avgSleep: 7,
          restingHR: null,
          hrv: null,
          generalFeeling: 'ok'
        }
      }

      setGeneratingStep('Genererer personlig treningsplan...')
      const plan = await generateTrainingPlan(userData)

      setGeneratingStep('Ferdig!')
      setGeneratedPlan(plan)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
      setGeneratingStep('')
    }
  }

  const handleSavePlan = async () => {
    if (!generatedPlan) return

    try {
      const monday = getNextMonday()
      await savePlan({
        ...generatedPlan,
        weekStart: monday.toISOString(),
        generatedBy: 'ai'
      })
      setGeneratedPlan(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const displayPlan = generatedPlan || currentPlan

  // Vis wizard hvis aktiv
  if (showWizard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
            <Brain className="text-secondary" />
            Lag din personlige treningsplan
          </h1>
          <p className="text-text-secondary mt-1">
            Svar på noen spørsmål så lager AI en plan tilpasset deg
          </p>
        </div>

        <PlanningWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <Brain className="text-secondary" />
          AI Treningsplan
        </h1>
        <p className="text-text-secondary mt-1">
          La AI generere en personlig treningsplan
        </p>
      </div>

      {/* Generate button */}
      {generating ? (
        <div className="card bg-secondary/10 border-secondary/20">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="spinner" />
            <p className="text-secondary font-medium">{generatingStep}</p>
            <p className="text-xs text-text-muted">Dette kan ta 10-30 sekunder...</p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartWizard}
          className="btn-primary w-full py-4"
        >
          <Sparkles size={20} />
          {currentPlan ? 'Generer ny plan' : 'Generer treningsplan'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      {/* Plan display */}
      {displayPlan && (
        <div className="space-y-4">
          {/* Plan header */}
          <div className="card bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-secondary font-medium uppercase tracking-wide">
                  {generatedPlan ? 'Ny generert plan' : `Uke ${displayPlan.weekNumber || ''}`}
                </p>
                <h3 className="font-heading font-bold text-lg text-text-primary mt-1">
                  {displayPlan.focus}
                </h3>
                {displayPlan.totalLoad && (
                  <p className="text-sm text-text-muted mt-2">
                    {displayPlan.totalLoad.running_km} km løping • {displayPlan.totalLoad.strength_sessions} styrkeøkter
                  </p>
                )}
              </div>
              {generatedPlan && (
                <button onClick={handleSavePlan} className="btn-primary text-sm">
                  <Check size={16} />
                  Bruk
                </button>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div className="space-y-2">
            {displayPlan.sessions?.map((session, idx) => (
              <SessionCard key={idx} session={session} />
            ))}
          </div>

          {/* Tips */}
          {displayPlan.weeklyTips?.length > 0 && (
            <div className="card">
              <h3 className="font-medium text-text-primary mb-2">Tips for uken</h3>
              <ul className="space-y-1">
                {displayPlan.weeklyTips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-success">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!displayPlan && !generating && (
        <div className="card text-center py-12">
          <Brain size={48} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-muted">
            Trykk på knappen for å generere en AI-treningsplan basert på dine mål og historikk
          </p>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }) {
  const dayNames = {
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag'
  }

  const type = getWorkoutType(session.type)

  return (
    <div className={`card ${session.completed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${type.color}20` }}
        >
          {type.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted uppercase tracking-wide">
              {dayNames[session.day]}
            </p>
            {session.completed && (
              <Check size={16} className="text-success" />
            )}
          </div>
          <h4 className="font-medium text-text-primary mt-0.5">
            {session.title}
          </h4>
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
            {session.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {session.duration_minutes} min
            </span>
            {session.details?.distance_km && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {session.details.distance_km} km
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getNextMonday() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // If Sunday (0), next Monday is tomorrow (1 day)
  // If Monday (1), next Monday is today (0 days)
  // Otherwise, calculate days until next Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  return nextMonday
}
