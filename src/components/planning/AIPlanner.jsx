import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { generateTrainingPlan } from '../../services/aiService'
import { getWorkoutType } from '../../data/workoutTypes'
import { Brain, Sparkles, RefreshCw, Check, Clock, MapPin, Edit2, Trash2, Plus, GripVertical, Image as ImageIcon, FileDown, X, Info } from 'lucide-react'
import PlanningWizard from './PlanningWizard'
import PlanAnalysis from './PlanAnalysis'
import ImageUpload from '../common/ImageUpload'
import { scanWorkout } from '../../services/workoutScanService'
import { exportPlanToPDF } from '../../utils/planExport'
import { toast } from 'react-hot-toast'
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
  const { workouts, currentPlan, savePlan, updatePlanSession, addPlanSession, deletePlanSession, addWorkout } = useWorkouts()
  const [showWizard, setShowWizard] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState('')
  const [error, setError] = useState(null)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [justSaved, setJustSaved] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [addingSessionDay, setAddingSessionDay] = useState(null)
  const [viewingSession, setViewingSession] = useState(null)
  const [completingSession, setCompletingSession] = useState(null)

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
      const planData = await generateTrainingPlan(userData)

      setGeneratingStep('Lagrer planer...')

      // Håndter flerukers planer
      if (planData.weeks && Array.isArray(planData.weeks)) {
        // Ny flerukers struktur
        const startMonday = getNextMonday()

        // Lagre alle ukene
        for (let i = 0; i < planData.weeks.length; i++) {
          const week = planData.weeks[i]

          // Beregn riktig mandag for denne uken
          const weekMonday = new Date(startMonday)
          weekMonday.setDate(startMonday.getDate() + (i * 7))

          const weekPlan = {
            weekNumber: week.weekNumber,
            phase: week.phase,
            focus: week.focus,
            totalLoad: week.totalLoad,
            sessions: week.sessions,
            weeklyTips: week.weeklyTips,
            weekStart: weekMonday.toISOString(),
            generatedBy: 'ai',
            wizardAnswers: wizardAnswers,
            planDuration: planData.planDuration,
            overallStrategy: planData.overallStrategy,
            milestones: planData.milestones
          }

          await savePlan(weekPlan)
          setGeneratingStep(`Lagret uke ${i + 1}/${planData.weeks.length}...`)
        }

        // Vis første uke umiddelbart
        setGeneratedPlan({
          ...planData.weeks[0],
          weekStart: startMonday.toISOString(),
          generatedBy: 'ai'
        })
      } else {
        // Gammel enkeltuke-struktur (backwards compatibility)
        const monday = getNextMonday()
        const savedPlan = {
          ...planData,
          weekStart: monday.toISOString(),
          generatedBy: 'ai',
          wizardAnswers: wizardAnswers
        }
        await savePlan(savedPlan)
        setGeneratedPlan(savedPlan)
      }

      setGeneratingStep('Ferdig!')
      setJustSaved(true)
      toast.success(`🎯 ${planData.weeks?.length || 1} ukers plan generert!`)

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

  // Håndter mark session as completed
  const handleMarkCompleted = async (session, workoutData = {}) => {
    if (!currentPlan) return

    try {
      // Calculate the date for this session based on plan weekStart and day
      const weekStart = new Date(currentPlan.weekStart)
      const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(session.day)
      const sessionDate = new Date(weekStart)
      sessionDate.setDate(weekStart.getDate() + dayIndex)

      // Create workout from session
      const workout = {
        type: session.type,
        date: sessionDate.toISOString(),
        duration: workoutData.duration || session.duration_minutes,
        rpe: workoutData.rpe || null,
        notes: workoutData.notes || session.description,
        // Add session-specific data
        ...(session.type === 'running' || session.type === 'easy_run' || session.type === 'tempo' || session.type === 'interval' || session.type === 'long_run' ? {
          running: {
            distance: workoutData.distance || session.details?.distance_km || 0,
            avgPace: workoutData.avgPace || session.details?.target_pace || null,
            surface: workoutData.surface || null
          }
        } : {}),
        ...(workoutData.strength ? { strength: workoutData.strength } : {}),
        fromPlan: true,
        planSessionId: session.id
      }

      // Add workout to logged workouts
      await addWorkout(workout)

      // Mark session as completed in plan
      await updatePlanSession(currentPlan.id, session.id, {
        status: 'completed',
        completedAt: new Date(),
        completedWorkoutData: workoutData
      })

      setCompletingSession(null)
      toast.success('✅ Økt markert som gjennomført!')
    } catch (err) {
      console.error('Failed to mark session as completed:', err)
      setError('Kunne ikke markere økten som gjennomført')
      toast.error('Kunne ikke markere økten som gjennomført')
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
              <button
                onClick={() => {
                  try {
                    exportPlanToPDF(displayPlan, displayPlan.weekStart || new Date().toISOString())
                    toast.success('📄 Plan eksportert til PDF!')
                  } catch (error) {
                    console.error('PDF export error:', error)
                    toast.error('Kunne ikke eksportere PDF')
                  }
                }}
                className="btn-secondary flex items-center gap-2 ml-3"
                title="Eksporter plan til PDF"
              >
                <FileDown size={18} />
                <span className="hidden sm:inline">Eksporter PDF</span>
              </button>
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
                  onView={setViewingSession}
                  onMarkCompleted={setCompletingSession}
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

      {/* Session Detail Modal */}
      {viewingSession && (
        <SessionDetailModal
          session={viewingSession}
          onClose={() => setViewingSession(null)}
        />
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

      {/* Complete Session Modal */}
      {completingSession && (
        <CompleteSessionModal
          session={completingSession}
          onSave={handleMarkCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}
    </div>
  )
}

// DayColumn component for grouping sessions by day
function DayColumn({ day, sessions, onEdit, onDelete, onView, onMarkCompleted, onAddSession, isEditable }) {
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
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors relative z-10"
            aria-label={`Legg til økt på ${dayNames[day]}`}
          >
            <Plus size={16} />
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
              onView={onView}
              onMarkCompleted={onMarkCompleted}
              isEditable={isEditable}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Draggable Session Card
function DraggableSessionCard({ session, onEdit, onDelete, onView, onMarkCompleted, isEditable }) {
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
  const isCompleted = session.status === 'completed'

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`bg-background-secondary border border-white/10 rounded-xl p-3 ${
        isCompleted ? 'opacity-60 bg-success/5 border-success/20' : ''
      } transition-colors`}
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
        <div className="flex flex-col sm:flex-row items-center gap-1">
          {/* View details button */}
          <button
            onClick={() => onView && onView(session)}
            className="p-1.5 text-text-muted hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
            aria-label="Se detaljer"
            title="Se detaljer"
          >
            <Info size={14} />
          </button>

          {/* Mark as completed button */}
          {!isCompleted && (
            <button
              onClick={() => onMarkCompleted && onMarkCompleted(session)}
              className="p-1.5 text-text-muted hover:text-success hover:bg-success/10 rounded-lg transition-colors"
              aria-label="Marker som gjennomført"
              title="Marker som gjennomført"
            >
              <Check size={14} />
            </button>
          )}

          {isCompleted && (
            <div className="p-1.5 text-success" title="Gjennomført">
              <Check size={14} />
            </div>
          )}

          {isEditable && !isCompleted && (
            <>
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
            </>
          )}
        </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-background-primary rounded-xl max-w-md w-full p-6 pb-36">
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
  const [images, setImages] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)

  const dayNames = {
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag'
  }

  // Handle image upload and OCR
  const handleImagesChange = async (newImages) => {
    setImages(newImages)
    setScanError(null)

    // Only scan if there are new images and we haven't scanned yet
    if (newImages.length > 0 && !scanning && !formData.title) {
      setScanning(true)
      try {
        const result = await scanWorkout(newImages)

        // Auto-fill form with OCR results
        setFormData({
          type: result.type || formData.type,
          title: result.title || formData.title,
          description: result.description || formData.description,
          duration_minutes: result.duration_minutes || formData.duration_minutes
        })
      } catch (err) {
        console.error('OCR scan error:', err)
        setScanError('Kunne ikke lese bildet automatisk. Fyll inn feltene manuelt.')
      } finally {
        setScanning(false)
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(day, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-background-primary rounded-xl max-w-md w-full p-6 pb-36 my-4">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          Legg til økt - {dayNames[day]}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="input-label flex items-center gap-2">
              <ImageIcon size={16} />
              Last opp skjermbilde fra whiteboard/trening (valgfritt)
            </label>
            <ImageUpload
              images={images}
              onImagesChange={handleImagesChange}
              maxImages={3}
            />
            {scanning && (
              <div className="mt-2 p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary text-sm flex items-center gap-2">
                <div className="spinner-sm" />
                Leser treningsøkt fra bilde...
              </div>
            )}
            {scanError && (
              <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded-xl text-warning text-sm">
                {scanError}
              </div>
            )}
          </div>

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
            <button type="submit" className="btn-primary flex-1" disabled={scanning}>
              Legg til
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Session Detail Modal
function SessionDetailModal({ session, onClose }) {
  const type = getWorkoutType(session.type)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-background-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-background-card border-b border-gray-200 dark:border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${type.color}20` }}
            >
              {type.icon}
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-text-primary">
                {session.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-text-muted">{type.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Lukk"
          >
            <X size={20} className="text-gray-600 dark:text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick info */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-text-secondary">
              <Clock size={18} className="text-primary" />
              <span className="font-medium">{session.duration_minutes} min</span>
            </div>
            {session.details?.distance_km && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-text-secondary">
                <MapPin size={18} className="text-primary" />
                <span className="font-medium">{session.details.distance_km} km</span>
              </div>
            )}
          </div>

          {/* Description */}
          {session.description && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-text-primary mb-2 flex items-center gap-2">
                <Info size={18} className="text-primary" />
                Beskrivelse
              </h3>
              <p className="text-gray-700 dark:text-text-secondary whitespace-pre-wrap leading-relaxed">
                {session.description}
              </p>
            </div>
          )}

          {/* Details */}
          {session.details && (
            <div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-text-primary mb-3">
                Detaljer
              </h3>
              <div className="space-y-2">
                {session.details.target_pace && (
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-text-muted">Mål tempo</span>
                    <span className="font-medium text-gray-900 dark:text-text-primary">
                      {session.details.target_pace}
                    </span>
                  </div>
                )}
                {session.details.intensity && (
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-text-muted">Intensitet</span>
                    <span className="font-medium text-gray-900 dark:text-text-primary">
                      {session.details.intensity}
                    </span>
                  </div>
                )}
                {session.details.warmup && (
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-text-muted">Oppvarming</span>
                    <span className="font-medium text-gray-900 dark:text-text-primary">
                      {session.details.warmup}
                    </span>
                  </div>
                )}
                {session.details.cooldown && (
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-text-muted">Nedkjøling</span>
                    <span className="font-medium text-gray-900 dark:text-text-primary">
                      {session.details.cooldown}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional notes */}
          {session.notes && (
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
              <h3 className="font-heading font-semibold text-gray-900 dark:text-text-primary mb-2">
                Notater
              </h3>
              <p className="text-sm text-gray-700 dark:text-text-secondary">
                {session.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-background-card border-t border-gray-200 dark:border-white/10 p-4">
          <button
            onClick={onClose}
            className="btn-primary w-full"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  )
}

// Complete Session Modal
function CompleteSessionModal({ session, onSave, onCancel }) {
  const type = getWorkoutType(session.type)
  const [formData, setFormData] = useState({
    duration: session.duration_minutes || 60,
    rpe: 5,
    distance: session.details?.distance_km || 0,
    avgPace: '',
    surface: 'asphalt',
    notes: ''
  })

  const isRunning = ['easy_run', 'tempo', 'interval', 'long_run', 'running'].includes(session.type)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(session, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-background-card rounded-2xl max-w-md w-full my-8 shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-success/20 to-success/5 border-b border-success/20 p-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${type.color}20` }}
            >
              {type.icon}
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-text-primary">
                Marker som gjennomført
              </h2>
              <p className="text-sm text-gray-600 dark:text-text-muted">{session.title}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Duration */}
          <div>
            <label htmlFor="complete-duration" className="input-label">
              Varighet (minutter) *
            </label>
            <input
              id="complete-duration"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
              className="input"
              min="1"
              required
            />
          </div>

          {/* RPE */}
          <div>
            <label htmlFor="complete-rpe" className="input-label">
              RPE (Rate of Perceived Exertion) *
            </label>
            <div className="flex items-center gap-3">
              <input
                id="complete-rpe"
                type="range"
                min="1"
                max="10"
                value={formData.rpe}
                onChange={(e) => setFormData({ ...formData, rpe: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-lg font-bold text-primary w-8 text-center">{formData.rpe}</span>
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Veldig lett</span>
              <span>Maksimal</span>
            </div>
          </div>

          {/* Running-specific fields */}
          {isRunning && (
            <>
              <div>
                <label htmlFor="complete-distance" className="input-label">
                  Distanse (km)
                </label>
                <input
                  id="complete-distance"
                  type="number"
                  step="0.1"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="complete-pace" className="input-label">
                  Gjennomsnittlig fart (min/km)
                </label>
                <input
                  id="complete-pace"
                  type="text"
                  placeholder="5:30"
                  value={formData.avgPace}
                  onChange={(e) => setFormData({ ...formData, avgPace: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="complete-surface" className="input-label">
                  Underlag
                </label>
                <select
                  id="complete-surface"
                  value={formData.surface}
                  onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                  className="input"
                >
                  <option value="asphalt">Asfalt</option>
                  <option value="trail">Sti/terreng</option>
                  <option value="track">Bane</option>
                  <option value="treadmill">Tredemølle</option>
                </select>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="complete-notes" className="input-label">
              Notater
            </label>
            <textarea
              id="complete-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input resize-none"
              rows={3}
              placeholder="Hvordan følte økten seg? Eventuelle notater..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-outline flex-1">
              Avbryt
            </button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Check size={18} />
              Marker som gjennomført
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
