import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { generateTrainingPlan } from '../../services/aiService'
import { getWorkoutType } from '../../data/workoutTypes'
import { Brain, Sparkles, RefreshCw, Check, Clock, MapPin, Edit2, Trash2, Plus, GripVertical } from 'lucide-react'
import PlanningWizard from './PlanningWizard'
import PlanAnalysis from './PlanAnalysis'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function AIPlanner() {
  const { userProfile } = useAuth()
  const { workouts, currentPlan, savePlan, updatePlanSession, addPlanSession, deletePlanSession } = useWorkouts()
  const [showWizard, setShowWizard] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState('')
  const [error, setError] = useState(null)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [justSaved, setJustSaved] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [addingSessionDay, setAddingSessionDay] = useState(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

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

      setGeneratingStep('Lagrer plan...')

      // Automatisk lagre planen til Firestore
      const monday = getNextMonday()
      const savedPlan = {
        ...plan,
        weekStart: monday.toISOString(),
        generatedBy: 'ai',
        wizardAnswers: wizardAnswers // Lagre preferanser for fremtidig bruk
      }
      await savePlan(savedPlan)

      // Vis planen umiddelbart mens vi venter på Firestore oppdatering
      setGeneratedPlan(savedPlan)
      setGeneratingStep('Ferdig!')
      setJustSaved(true)

      // Skjul suksessmeldingen etter 5 sekunder
      setTimeout(() => setJustSaved(false), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
      setGeneratingStep('')
    }
  }

  const handleRegeneratePlan = () => {
    // Bekreft før regenerering hvis det finnes en eksisterende plan
    if (currentPlan) {
      if (confirm('Dette vil erstatte din nåværende plan. Er du sikker?')) {
        setShowWizard(true)
      }
    } else {
      setShowWizard(true)
    }
  }

  // Håndter drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (!over || !currentPlan) return

    // Extract session ID and day from the IDs
    const activeId = active.id
    const overDay = over.id

    // Find the session that was dragged
    const session = currentPlan.sessions.find(s => s.id === activeId)
    if (!session) return

    // If the session was dragged to a different day
    if (session.day !== overDay) {
      try {
        await updatePlanSession(currentPlan.id, activeId, { day: overDay })
      } catch (err) {
        setError('Kunne ikke flytte økten')
      }
    }
  }

  // Håndter edit session
  const handleEditSession = async (sessionId, updates) => {
    if (!currentPlan) return

    try {
      await updatePlanSession(currentPlan.id, sessionId, updates)
      setEditingSession(null)
    } catch (err) {
      setError('Kunne ikke oppdatere økten')
    }
  }

  // Håndter delete session
  const handleDeleteSession = async (sessionId) => {
    if (!currentPlan) return

    if (confirm('Er du sikker på at du vil slette denne økten?')) {
      try {
        await deletePlanSession(currentPlan.id, sessionId)
      } catch (err) {
        setError('Kunne ikke slette økten')
      }
    }
  }

  // Håndter add session
  const handleAddSession = async (day, sessionData) => {
    if (!currentPlan) return

    try {
      await addPlanSession(currentPlan.id, { ...sessionData, day })
      setAddingSessionDay(null)
    } catch (err) {
      setError('Kunne ikke legge til økten')
    }
  }

  const displayPlan = generatedPlan || currentPlan

  // Grupper økter per dag
  const sessionsByDay = displayPlan?.sessions?.reduce((acc, session) => {
    const day = session.day || 'monday'
    if (!acc[day]) acc[day] = []
    acc[day].push(session)
    return acc
  }, {}) || {}

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
        <div
          className="card bg-secondary/10 border-secondary/20"
          role="status"
          aria-live="polite"
          aria-label="Genererer treningsplan"
        >
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="spinner" aria-hidden="true" />
            <p className="text-secondary font-medium">{generatingStep}</p>
            <p className="text-xs text-text-muted">Dette kan ta 10-30 sekunder...</p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleRegeneratePlan}
          className="btn-primary w-full py-4"
          aria-label={currentPlan ? 'Oppdater eksisterende treningsplan med AI' : 'Lag ny treningsplan med AI'}
        >
          <Sparkles size={20} aria-hidden="true" />
          {currentPlan ? 'Oppdater treningsplan' : 'Lag treningsplan'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div
          className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* Success message if just saved */}
      {justSaved && (
        <div
          className="p-4 bg-success/10 border border-success/20 rounded-xl text-success text-sm flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <Check size={18} aria-hidden="true" />
          <span>Treningsplan lagret! Du finner den her når du kommer tilbake.</span>
        </div>
      )}

      {/* Plan display */}
      {displayPlan && (
        <div className="space-y-4">

          {/* Plan header */}
          <div className="card bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-secondary font-medium uppercase tracking-wide">
                  Uke {displayPlan.weekNumber || ''}
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
            </div>
          </div>

          {/* Sessions grouped by day */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <DayColumn
                  key={day}
                  day={day}
                  sessions={sessionsByDay[day] || []}
                  onEdit={setEditingSession}
                  onDelete={handleDeleteSession}
                  onAddSession={() => setAddingSessionDay(day)}
                  isEditable={!!currentPlan}
                />
              ))}
            </div>
          </DndContext>

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

          {/* Plan Analysis - show only for saved plans (currentPlan) */}
          {currentPlan && !generatedPlan && (
            <div>
              <h3 className="font-heading text-lg font-bold text-text-primary mb-4">
                Analyse av uke {currentPlan.weekNumber}
              </h3>
              <PlanAnalysis plan={currentPlan} />
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

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onSave={handleEditSession}
          onCancel={() => setEditingSession(null)}
        />
      )}

      {/* Add Session Modal */}
      {addingSessionDay && (
        <AddSessionModal
          day={addingSessionDay}
          onSave={handleAddSession}
          onCancel={() => setAddingSessionDay(null)}
        />
      )}
    </div>
  )
}

// DayColumn component for grouping sessions by day
function DayColumn({ day, sessions, onEdit, onDelete, onAddSession, isEditable }) {
  const dayNames = {
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag'
  }

  const { setNodeRef } = useDroppable({
    id: day
  })

  return (
    <div className="card" ref={setNodeRef}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-text-primary">{dayNames[day]}</h3>
        {isEditable && (
          <button
            onClick={onAddSession}
            className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
            aria-label={`Legg til økt på ${dayNames[day]}`}
          >
            <Plus size={14} />
            Legg til
          </button>
        )}
      </div>

      <div className="space-y-2 min-h-[80px]">
        {sessions.length === 0 ? (
          <p className="text-sm text-text-muted italic py-4 text-center">
            Ingen økter planlagt
          </p>
        ) : (
          sessions.map(session => (
            <DraggableSessionCard
              key={session.id || session.title}
              session={session}
              onEdit={onEdit}
              onDelete={onDelete}
              isEditable={isEditable}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Draggable Session Card
function DraggableSessionCard({ session, onEdit, onDelete, isEditable }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform
  } = useDraggable({
    id: session.id || session.title,
    disabled: !isEditable
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined

  const type = getWorkoutType(session.type)

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`bg-background-secondary border border-white/10 rounded-xl p-3 ${
        session.completed ? 'opacity-60' : ''
      }`}
      aria-label={`Treningsøkt: ${session.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {isEditable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary mt-1"
            aria-label="Dra for å flytte økt"
          >
            <GripVertical size={16} />
          </button>
        )}

        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${type.color}20` }}
          aria-hidden="true"
        >
          {type.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
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

        {/* Actions */}
        {isEditable && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(session)}
              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              aria-label="Rediger økt"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(session.id)}
              className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              aria-label="Slett økt"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

// Edit Session Modal
function EditSessionModal({ session, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: session.title || '',
    description: session.description || '',
    duration_minutes: session.duration_minutes || 60
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(session.id, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-primary rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">Rediger økt</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="input-label">Tittel</label>
            <input
              id="edit-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="input-label">Beskrivelse</label>
            <textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input resize-none"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="edit-duration" className="input-label">Varighet (minutter)</label>
            <input
              id="edit-duration"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="input"
              min="1"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="btn-outline flex-1">
              Avbryt
            </button>
            <button type="submit" className="btn-primary flex-1">
              Lagre
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Session Modal
function AddSessionModal({ day, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    type: 'hyrox',
    title: '',
    description: '',
    duration_minutes: 60
  })

  const dayNames = {
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag'
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(day, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-primary rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          Legg til økt - {dayNames[day]}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-type" className="input-label">Type</label>
            <select
              id="add-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              <option value="hyrox">Hyrox</option>
              <option value="crossfit">CrossFit</option>
              <option value="strength">Styrketrening</option>
              <option value="rest">Hviledag</option>
              <option value="other">Annet</option>
            </select>
          </div>
          <div>
            <label htmlFor="add-title" className="input-label">Tittel</label>
            <input
              id="add-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="F.eks. Hyrox-økt på senter"
              required
            />
          </div>
          <div>
            <label htmlFor="add-description" className="input-label">Beskrivelse</label>
            <textarea
              id="add-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input resize-none"
              rows={3}
              placeholder="Beskriv økten..."
            />
          </div>
          <div>
            <label htmlFor="add-duration" className="input-label">Varighet (minutter)</label>
            <input
              id="add-duration"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="input"
              min="1"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="btn-outline flex-1">
              Avbryt
            </button>
            <button type="submit" className="btn-primary flex-1">
              Legg til
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getNextMonday() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // Get Monday of current week (or next Monday if today is Sunday)
  // Sunday (0) -> next Monday (1 day ahead)
  // Monday (1) -> today (0 days)
  // Tuesday-Saturday -> previous Monday
  let daysToMonday
  if (dayOfWeek === 0) {
    // Sunday - use next Monday
    daysToMonday = 1
  } else {
    // Monday-Saturday - use Monday of this week
    daysToMonday = -(dayOfWeek - 1)
  }

  const monday = new Date(today)
  monday.setDate(today.getDate() + daysToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}
