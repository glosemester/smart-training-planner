import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { generateTrainingPlan, generateTrainingPlanChunk } from '../../services/aiService'
import { getWorkoutType } from '../../data/workoutTypes'
import { Brain, Sparkles, RefreshCw, Check, Clock, MapPin, Edit2, Trash2, Plus, GripVertical, Image as ImageIcon, FileDown, X, Info, ChevronLeft, Activity, Download, Play } from 'lucide-react'
import PlanningWizard from './PlanningWizard'
import PlanAnalysis from './PlanAnalysis'
import ImageUpload from '../common/ImageUpload'
import { scanWorkout } from '../../services/workoutScanService'
import { getMatchingStravaActivity } from '../../services/stravaService'
import { exportPlanToPDF } from '../../utils/planExport'
import LiveWorkout from '../workout/LiveWorkout'
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
  const { workouts, currentPlan, plans, setCurrentPlan, savePlan, saveMultipleWeeks, updatePlanSession, addPlanSession, deletePlanSession, deleteAllPlans, addWorkout } = useWorkouts()
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
  const [liveWorkoutSession, setLiveWorkoutSession] = useState(null)
  const [chunkProgress, setChunkProgress] = useState({
    currentChunk: 0,
    totalChunks: 0,
    completedWeeks: 0,
    totalWeeks: 0
  })
  const [planContext, setPlanContext] = useState(null)

  // Smart oppdatering: Overvåk currentPlan og fjern midlertidig generatedPlan når sync er ok
  useEffect(() => {
    if (currentPlan && generatedPlan) {
      console.log('Sync detected: currentPlan updated, clearing temporary generatedPlan')
      setGeneratedPlan(null)
    }
  }, [currentPlan, generatedPlan])

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

      // Calculate total weeks needed
      const totalWeeks = calculateTotalWeeks(wizardAnswers)
      const weeksPerChunk = 1  // Kept at 1 week for safety, but Haiku should be much faster
      const totalChunks = Math.ceil(totalWeeks / weeksPerChunk)

      // Initialize progress
      setChunkProgress({
        currentChunk: 0,
        totalChunks,
        completedWeeks: 0,
        totalWeeks
      })

      let contextForNextChunk = null
      let lastWeekSummary = null
      const startMonday = getNextMonday()
      const allWeeksBuffer = [] // 1. Local buffer for ALL weeks

      // Generate chunks sequentially
      for (let chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
        const startWeek = (chunkNum - 1) * weeksPerChunk + 1
        const weeksInThisChunk = Math.min(weeksPerChunk, totalWeeks - (chunkNum - 1) * weeksPerChunk)

        // Update progress
        setChunkProgress(prev => ({ ...prev, currentChunk: chunkNum }))
        setGeneratingStep(
          `Planlegger uke ${startWeek}-${startWeek + weeksInThisChunk - 1}... ` +
          `(del ${chunkNum}/${totalChunks})`
        )

        // Prepare chunk info
        const chunkInfo = {
          chunkNumber: chunkNum,
          totalChunks: totalChunks,
          weeksPerChunk: weeksPerChunk,
          startWeek: startWeek,
          totalWeeks: totalWeeks,
          isFirstChunk: chunkNum === 1,
          previousWeekSummary: chunkNum === 1 ? null : lastWeekSummary,
          overallStrategy: chunkNum === 1 ? null : contextForNextChunk.overallStrategy,
          phaseGuidelines: chunkNum === 1 ? null : contextForNextChunk.phaseGuidelines
        }

        // Generate this chunk with retry logic
        let chunkData = null
        let retries = 0
        const MAX_RETRIES = 3

        while (!chunkData && retries < MAX_RETRIES) {
          try {
            if (retries > 0) {
              setGeneratingStep(
                `Planlegger uke ${startWeek}-${startWeek + weeksInThisChunk - 1}... ` +
                `(Prøve ${retries + 1}/${MAX_RETRIES})`
              )
              await new Promise(resolve => setTimeout(resolve, 2000))
            }

            chunkData = await generateTrainingPlanChunk({
              userData,
              chunkInfo
            })
          } catch (err) {
            console.warn(`Chunk generation failed (attempt ${retries + 1}):`, err)
            retries++
            if (retries >= MAX_RETRIES) throw new Error(`Feilet etter ${MAX_RETRIES} forsøk: ${err.message}`)
          }
        }

        // Store context from first chunk
        if (chunkNum === 1) {
          contextForNextChunk = {
            overallStrategy: chunkData.overallStrategy,
            milestones: chunkData.milestones,
            phaseGuidelines: chunkData.phaseGuidelines
          }
          setPlanContext(contextForNextChunk)
        }

        // Validate chunk data
        if (!chunkData || !chunkData.weeks || !Array.isArray(chunkData.weeks)) {
          throw new Error('Noe gikk galt med planleggingen. Prøv igjen.')
        }

        // Process weeks in this chunk
        for (let i = 0; i < chunkData.weeks.length; i++) {
          const week = chunkData.weeks[i]
          const weekNumber = startWeek + i

          // Calculate monday for this week
          const weekMonday = new Date(startMonday)
          weekMonday.setDate(startMonday.getDate() + ((weekNumber - 1) * 7))

          const weekPlan = {
            weekNumber: weekNumber,
            phase: week.phase,
            focus: week.focus,
            totalLoad: week.totalLoad,
            sessions: week.sessions,
            weeklyTips: week.weeklyTips,
            weekStart: weekMonday.toISOString(),
            generatedBy: 'ai',
            wizardAnswers: wizardAnswers,
            planDuration: totalWeeks,
            overallStrategy: contextForNextChunk.overallStrategy,
            milestones: contextForNextChunk.milestones
          }

          allWeeksBuffer.push(weekPlan) // Add to buffer

          // Store summary for next chunk's context
          if (i === chunkData.weeks.length - 1) {
            lastWeekSummary = {
              weekNumber: weekNumber,
              phase: week.phase,
              totalLoad: week.totalLoad,
              keyWorkouts: week.sessions
                .filter(s => ['long_run', 'tempo', 'interval'].includes(s.type))
                .map(s => s.title)
                .slice(0, 3)
            }
          }
        }

        // Update temporary progress UI without saving
        setChunkProgress(prev => ({
          ...prev,
          completedWeeks: allWeeksBuffer.length
        }))
      }

      // 2. Batch Save ALL weeks sequentially (or parallel if supported)
      setGeneratingStep(`Lagrer ${allWeeksBuffer.length} uker til databasen...`)
      console.log('Batch saving all weeks:', allWeeksBuffer)

      // Use saveMultipleWeeks which handles the batch saving
      await saveMultipleWeeks(allWeeksBuffer)

      // 3. Success & Optimization
      setGeneratingStep('Ferdig!')
      setJustSaved(true)
      toast.success(`🎯 ${totalWeeks} ukers plan lagret!`)

      // Wait a moment for context to potentially update, but we trust optimistic update from savePlan
      console.log('Generering og lagring fullført.')

      // NB: Vi fjerner IKKE setGeneratedPlan(null) her.
      // Vi beholder den visningen inntil brukeren selv navigerer eller context oppdateres.

    } catch (err) {
      console.error('Plan generation error:', err)
      setError(err.message || 'Kunne ikke generere treningsplan')
      toast.error('Noe gikk galt ved generering av plan')
    } finally {
      setGenerating(false)
      setGeneratingStep('')
    }
  }

  // Calculate total weeks based on wizard answers
  // Calculate total weeks based on wizard answers
  function calculateTotalWeeks(wizardAnswers) {
    // Handle both old structure (goal === 'race') and new structure (goal.type === 'race')
    const goalType = wizardAnswers.goal?.type || wizardAnswers.goal
    const raceDate = wizardAnswers.goal?.date || wizardAnswers.raceDetails?.date

    if (goalType === 'race' && raceDate) {
      const raceDateObj = new Date(raceDate)
      const today = new Date()
      const weeksUntilRace = Math.ceil((raceDateObj - today) / (7 * 24 * 60 * 60 * 1000))
      console.log(`📅 Race date: ${raceDate}, Weeks until race: ${weeksUntilRace}`)
      return Math.max(4, Math.min(weeksUntilRace, 52))  // Min 4, max 52 weeks
    }
    return 12  // Default 12 weeks for non-race goals
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
        // Only include planSessionId if it exists (avoid undefined in Firestore)
        ...(session.id ? { planSessionId: session.id } : {})
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
          <button
            onClick={() => setShowWizard(false)}
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-2 flex items-center gap-1"
          >
            <ChevronLeft size={16} /> Tilbake
          </button>
          <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="text-primary" />
            Ny treningsplan
          </h1>
        </div>

        <PlanningWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-white">
            Plan
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Ukens oversikt
          </p>
        </div>
      </div>

      {/* Generate button */}
      {generating ? (
        <div
          className="card border-dashed border-2 p-8"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="spinner" aria-hidden="true" />
            <p className="text-gray-900 dark:text-white font-medium">{generatingStep}</p>

            {/* Progress bar */}
            {chunkProgress.totalChunks > 0 && (
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Genererer del {chunkProgress.currentChunk} av {chunkProgress.totalChunks}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(chunkProgress.completedWeeks / chunkProgress.totalWeeks) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={handleRegeneratePlan}
          className="btn-primary w-full py-4 shadow-lg shadow-primary/20"
        >
          <Sparkles size={20} className="mr-2" />
          {currentPlan ? 'Lag ny plan' : 'Opprett treningsplan'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Plan display */}
      {displayPlan && (
        <div className="space-y-6">

          {/* Week Navigation - only show if there are multiple weeks */}
          {plans.length > 1 && (
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
              <button
                onClick={() => {
                  const currentIndex = plans.findIndex(p => p.id === currentPlan?.id)
                  if (currentIndex < plans.length - 1) {
                    setCurrentPlan(plans[currentIndex + 1]) // plans sorted by weekStart desc
                  }
                }}
                disabled={plans.findIndex(p => p.id === currentPlan?.id) >= plans.length - 1}
                className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Forrige uke
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {plans.length} uker i planen
                </span>
                <button
                  onClick={async () => {
                    if (window.confirm(`Er du sikker på at du vil slette alle ${plans.length} uker?\n\nDette kan ikke angres.`)) {
                      try {
                        await deleteAllPlans()
                        toast.success('Alle planer slettet!')
                      } catch (err) {
                        toast.error('Kunne ikke slette planer')
                      }
                    }
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Slett alle planer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <button
                onClick={() => {
                  const currentIndex = plans.findIndex(p => p.id === currentPlan?.id)
                  if (currentIndex > 0) {
                    setCurrentPlan(plans[currentIndex - 1]) // plans sorted by weekStart desc
                  }
                }}
                disabled={plans.findIndex(p => p.id === currentPlan?.id) <= 0}
                className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                Neste uke
                <ChevronLeft size={16} className="rotate-180" />
              </button>
            </div>
          )}

          {/* Plan header */}
          <div className="card bg-gray-900 text-white border-none p-6 relative overflow-hidden">
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Uke {displayPlan.weekNumber || ''} av {displayPlan.planDuration || '?'}
                  {displayPlan.weekStart && (
                    <span className="ml-2 text-gray-500 font-normal normal-case">
                      ({new Date(displayPlan.weekStart).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} - {
                        (() => {
                          const end = new Date(displayPlan.weekStart)
                          end.setDate(end.getDate() + 6)
                          return end.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
                        })()
                      })
                    </span>
                  )}
                </p>
                <h3 className="font-heading font-bold text-2xl mt-1">
                  {displayPlan.focus}
                </h3>
                {displayPlan.totalLoad && (
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-primary" />
                      {displayPlan.totalLoad.running_km} km
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} className="text-primary" />
                      {displayPlan.totalLoad.strength_sessions} økter
                    </span>
                  </div>
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
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Eksporter PDF"
              >
                <FileDown size={20} />
              </button>
            </div>

            {/* Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
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
            <div className="card bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20">
              <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                <Sparkles size={18} />
                Ukes-tips
              </h3>
              <ul className="space-y-2">
                {displayPlan.weeklyTips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-purple-800 dark:text-purple-200 flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-60" />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Plan Analysis - show only for saved plans (currentPlan) */}
          {currentPlan && !generatedPlan && (
            <div className="pt-4 border-t border-gray-200 dark:border-white/5">
              <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white mb-4">
                Analyse
              </h3>
              <PlanAnalysis plan={currentPlan} />
            </div>
          )}
        </div>
      )}

      {/* Empty state & Manual Refresh */}
      {!displayPlan && !generating && (
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ingen plan aktiv</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2 mb-4">
            Trykk på knappen over for å generere en skreddersydd treningsplan med AI.
          </p>

          {/* Manuell refresh knapp fjernet - vi stoler på state-oppdateringer */}
        </div>
      )}

      {/* Session Detail Modal */}
      {viewingSession && (
        <SessionDetailModal
          session={viewingSession}
          onClose={() => setViewingSession(null)}
          onStartLive={(session) => {
            setViewingSession(null)
            setLiveWorkoutSession(session)
          }}
        />
      )}

      {/* Live Workout */}
      {liveWorkoutSession && (
        <LiveWorkout
          session={liveWorkoutSession}
          onComplete={(data) => {
            // Auto-open complete modal with workout data
            setLiveWorkoutSession(null)
            setCompletingSession(liveWorkoutSession)
          }}
          onCancel={() => setLiveWorkoutSession(null)}
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
      className={`bg-background-secondary border border-white/10 rounded-xl p-3 ${isCompleted ? 'opacity-60 bg-success/5 border-success/20' : ''
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

// Treadmill Converter Component
function TreadmillConverter({ targetPace }) {
  const [incline, setIncline] = useState(1) // Default 1% for wind resistance compensation

  // Parse pace string "5:30" to minutes as decimal
  const parsePace = (paceStr) => {
    if (!paceStr) return null
    const match = paceStr.match(/(\d+):(\d+)/)
    if (!match) return null
    return parseInt(match[1]) + parseInt(match[2]) / 60
  }

  const paceMinutes = parsePace(targetPace)
  if (!paceMinutes) return null

  // Calculate speed in km/h
  const speedKmh = 60 / paceMinutes

  // Jones & Doust formula: 1% incline ≈ 0.8% increased energy cost
  // To maintain same effort on treadmill, reduce speed slightly per % incline
  const adjustedSpeed = speedKmh * (1 - incline * 0.008)

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
        <Activity size={18} />
        Mølle-innstillinger
      </h4>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <label className="text-sm text-blue-700 dark:text-blue-400 block mb-1">Stigning</label>
          <select
            value={incline}
            onChange={(e) => setIncline(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {[0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8].map(v => (
              <option key={v} value={v}>{v}%</option>
            ))}
          </select>
        </div>

        <div className="flex-1 text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {adjustedSpeed.toFixed(1)} km/t
          </div>
          <div className="text-sm text-blue-600/70 dark:text-blue-400/70">
            @ {incline}% stigning
          </div>
        </div>
      </div>

      <p className="text-xs text-blue-600/60 dark:text-blue-400/60 mt-3 text-center">
        Tilsvarer {targetPace}/km utendørs (Jones & Doust-formel)
      </p>
    </div>
  )
}

// Session Detail Modal
function SessionDetailModal({ session, onClose, onStartLive }) {
  const type = getWorkoutType(session.type)
  const isRunning = ['easy_run', 'tempo', 'interval', 'long_run', 'running'].includes(session.type)

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

          {/* Treadmill Converter - show for running sessions with target pace */}
          {isRunning && session.details?.target_pace && (
            <TreadmillConverter targetPace={session.details.target_pace} />
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

        {/* Footer with Live Workout button */}
        <div className="sticky bottom-0 bg-white dark:bg-background-card border-t border-gray-200 dark:border-white/10 p-4 space-y-3">
          {/* Start Live Workout button */}
          <button
            onClick={() => onStartLive?.(session)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-green-500/20"
          >
            <Play size={18} fill="currentColor" />
            Start live trening
          </button>

          <button
            onClick={onClose}
            className="btn-outline w-full"
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
  const { userProfile } = useAuth()
  const type = getWorkoutType(session.type)
  const [formData, setFormData] = useState({
    duration: session.duration_minutes || 60,
    rpe: 5,
    distance: session.details?.distance_km || 0,
    avgPace: '',
    avgHR: '',
    maxHR: '',
    surface: 'asphalt',
    notes: ''
  })
  const [stravaLoading, setStravaLoading] = useState(false)
  const [stravaImported, setStravaImported] = useState(false)

  const isRunning = ['easy_run', 'tempo', 'interval', 'long_run', 'running'].includes(session.type)

  // Hent data fra Strava
  const handleFetchFromStrava = async () => {
    if (!userProfile?.id) return

    setStravaLoading(true)
    try {
      // Beregn dato for denne økten basert på plan weekStart og dag
      const today = new Date()
      const stravaData = await getMatchingStravaActivity(userProfile.id, today.toISOString(), session.type)

      if (stravaData) {
        setFormData(prev => ({
          ...prev,
          duration: stravaData.duration || prev.duration,
          distance: stravaData.distance ? Math.round(stravaData.distance * 10) / 10 : prev.distance,
          avgPace: stravaData.avgPace || prev.avgPace,
          avgHR: stravaData.avgHR || prev.avgHR,
          maxHR: stravaData.maxHR || prev.maxHR
        }))
        setStravaImported(true)
        toast.success('✅ Data hentet fra Strava!')
      } else {
        toast.error('Fant ingen matchende aktivitet på Strava')
      }
    } catch (err) {
      console.error('Strava fetch error:', err)
      toast.error('Kunne ikke hente data fra Strava')
    } finally {
      setStravaLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(session, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-background-elevated rounded-3xl overflow-hidden border border-white/10 shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Fullfør økt</h3>
            <p className="text-sm text-text-secondary line-clamp-1">{session.activity} - {session.duration} min</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        {/* Strava Import Section */}
        <div className="px-6 pt-6">
          <button
            type="button"
            onClick={handleFetchFromStrava}
            disabled={stravaLoading || stravaImported}
            className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all
              ${stravaImported
                ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                : 'bg-[#FC6100]/10 text-[#FC6100] border border-[#FC6100]/20 hover:bg-[#FC6100]/20 active:scale-[0.98]'
              }`}
          >
            {stravaLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#FC6100]/30 border-t-[#FC6100] rounded-full animate-spin" />
                <span>Henter fra Strava...</span>
              </div>
            ) : stravaImported ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check size={18} className="text-green-400" />
                </div>
                <span>Økt hentet fra Strava</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-[#FC6100]/20 flex items-center justify-center group-hover:bg-[#FC6100]/30 transition-colors">
                  <img src="https://d3nn82uaxijpm6.cloudfront.net/assets/strava-logo-fc5817d23f38f1929cedc234a9b6c0e86b97b0a7ed90d79708709f1969a84a6a.svg" alt="Strava" className="w-4 h-4" />
                </div>
                <span>Hent fra Strava</span>
              </>
            )}
          </button>
          {!stravaImported && !stravaLoading && (
            <p className="text-[10px] text-center text-text-muted mt-2 font-medium uppercase tracking-wider">
              Automatisk utfylling av økten din
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="col-span-1">
              <label htmlFor="complete-duration" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Varighet (min) *
              </label>
              <input
                id="complete-duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                className="input bg-background-secondary border-white/5 focus:border-primary/50"
                min="1"
                required
              />
            </div>

            {/* RPE */}
            <div className="col-span-1">
              <label htmlFor="complete-rpe" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Anstrengelse (1-10) *
              </label>
              <div className="flex items-center gap-3 bg-background-secondary rounded-xl p-2.5 border border-white/5">
                <input
                  id="complete-rpe"
                  type="range"
                  min="1"
                  max="10"
                  value={formData.rpe}
                  onChange={(e) => setFormData({ ...formData, rpe: parseInt(e.target.value) })}
                  className="flex-1 accent-primary"
                />
                <span className="text-lg font-bold text-primary w-6 text-center">{formData.rpe}</span>
              </div>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-6 pt-2 border-t border-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="complete-distance" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Distanse (km)
                  </label>
                  <input
                    id="complete-distance"
                    type="number"
                    step="0.01"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                    className="input bg-background-secondary border-white/5 focus:border-primary/50"
                    min="0"
                  />
                </div>

                <div>
                  <label htmlFor="complete-pace" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Tempo (min/km)
                  </label>
                  <input
                    id="complete-pace"
                    type="text"
                    placeholder="5:30"
                    value={formData.avgPace}
                    onChange={(e) => setFormData({ ...formData, avgPace: e.target.value })}
                    className="input bg-background-secondary border-white/5 focus:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="complete-surface" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Underlag
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'asphalt', label: 'Asfalt' },
                    { id: 'trail', label: 'Sti' },
                    { id: 'track', label: 'Bane' },
                    { id: 'treadmill', label: 'Mølle' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, surface: s.id })}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${formData.surface === s.id
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-background-secondary border-white/5 text-text-muted hover:bg-white/5'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="complete-avghr" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Snitt puls
                  </label>
                  <div className="relative">
                    <input
                      id="complete-avghr"
                      type="number"
                      value={formData.avgHR}
                      onChange={(e) => setFormData({ ...formData, avgHR: e.target.value })}
                      className="input bg-background-secondary border-white/5 focus:border-primary/50 pr-10"
                      placeholder="145"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold">BPM</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="complete-maxhr" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Maks puls
                  </label>
                  <div className="relative">
                    <input
                      id="complete-maxhr"
                      type="number"
                      value={formData.maxHR}
                      onChange={(e) => setFormData({ ...formData, maxHR: e.target.value })}
                      className="input bg-background-secondary border-white/5 focus:border-primary/50 pr-10"
                      placeholder="175"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold">BPM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-white/5">
            <label htmlFor="complete-notes" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Notater
            </label>
            <textarea
              id="complete-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input bg-background-secondary border-white/5 focus:border-primary/50 resize-none min-h-[100px]"
              placeholder="Hvordan følte økten seg? Eventuelle notater..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-text-secondary font-bold transition-all border border-white/5"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-[2] py-4 px-6 rounded-2xl bg-primary hover:opacity-90 text-white font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Fullfør økt
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
