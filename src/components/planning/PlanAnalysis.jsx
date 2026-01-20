import { useState, useEffect } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { compareActualVsPlanned, generateSummary } from '../../services/planComparison'
import { getAdjustmentSuggestions } from '../../services/aiService'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info
} from 'lucide-react'

export default function PlanAnalysis({ plan }) {
  const { workouts } = useWorkouts()
  const [analysis, setAnalysis] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Kjør analyse når plan eller workouts endres
  useEffect(() => {
    if (plan && workouts) {
      const result = compareActualVsPlanned(plan, workouts)
      setAnalysis(result)
    }
  }, [plan, workouts])

  // Hent AI-justeringsforslag
  const handleGetSuggestions = async () => {
    if (!analysis) return

    setLoading(true)
    setError(null)

    try {
      const result = await getAdjustmentSuggestions(plan, analysis)
      setSuggestions(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!analysis) {
    return null
  }

  const totalPlanned = analysis.completed.length + analysis.modified.length + analysis.skipped.length
  const completionRate = totalPlanned > 0
    ? Math.round(((analysis.completed.length + analysis.modified.length) / totalPlanned) * 100)
    : 0

  // Bestem status-farge
  const getStatusColor = () => {
    if (completionRate >= 80) return 'success'
    if (completionRate >= 50) return 'warning'
    return 'error'
  }

  const statusColor = getStatusColor()

  // Sjekk om vi bør vise forslag
  const shouldShowSuggestion =
    analysis.skipped.length >= 2 ||
    Math.abs(analysis.totalLoadDiff.runningKm) > 5 ||
    analysis.extra.length >= 2

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={`card bg-${statusColor}/10 border-${statusColor}/20`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-text-primary mb-2">
              Ukens gjennomføring
            </h3>
            <p className="text-sm text-text-secondary">
              {generateSummary(analysis)}
            </p>

            {/* Completion rate */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Fullført</span>
                <span>{completionRate}%</span>
              </div>
              <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${statusColor} transition-all duration-500`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completed */}
        <div className="card bg-success/10 border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-success" />
            <span className="text-xs text-text-muted">Fullført</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {analysis.completed.length}
          </p>
        </div>

        {/* Skipped */}
        <div className="card bg-error/10 border-error/20">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-error" />
            <span className="text-xs text-text-muted">Hoppet over</span>
          </div>
          <p className="text-2xl font-bold text-error">
            {analysis.skipped.length}
          </p>
        </div>

        {/* Modified */}
        {analysis.modified.length > 0 && (
          <div className="card bg-warning/10 border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-warning" />
              <span className="text-xs text-text-muted">Modifisert</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              {analysis.modified.length}
            </p>
          </div>
        )}

        {/* Extra */}
        {analysis.extra.length > 0 && (
          <div className="card bg-primary/10 border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <PlusCircle size={16} className="text-primary" />
              <span className="text-xs text-text-muted">Ekstra</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {analysis.extra.length}
            </p>
          </div>
        )}
      </div>

      {/* Load difference */}
      {Math.abs(analysis.totalLoadDiff.runningKm) > 2 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            {analysis.totalLoadDiff.runningKm > 0 ? (
              <TrendingUp size={16} className="text-success" />
            ) : (
              <TrendingDown size={16} className="text-error" />
            )}
            <span className="text-sm font-medium text-text-primary">
              Belastning vs plan
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Løping:</span>
              <span className={analysis.totalLoadDiff.runningKm > 0 ? 'text-success' : 'text-error'}>
                {analysis.totalLoadDiff.runningKm > 0 ? '+' : ''}
                {analysis.totalLoadDiff.runningKm.toFixed(1)} km
              </span>
            </div>
            {analysis.totalLoadDiff.strengthSessions !== 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Styrke:</span>
                <span className={analysis.totalLoadDiff.strengthSessions > 0 ? 'text-success' : 'text-error'}>
                  {analysis.totalLoadDiff.strengthSessions > 0 ? '+' : ''}
                  {analysis.totalLoadDiff.strengthSessions}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestion callout */}
      {shouldShowSuggestion && !suggestions && (
        <div className="card bg-secondary/10 border-secondary/20">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-secondary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-text-primary mb-3">
                {analysis.skipped.length >= 2
                  ? `Du hoppet over ${analysis.skipped.length} økter denne uken. Vil du justere neste ukes plan?`
                  : 'Din gjennomføring avviker fra planen. Vil du ha AI-forslag til justeringer?'}
              </p>
              <button
                onClick={handleGetSuggestions}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    Få AI-forslag
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions && (
        <div className="card bg-primary/10 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-primary" />
            <h4 className="font-medium text-text-primary">AI-forslag til justeringer</h4>
          </div>

          <div className="space-y-3">
            {suggestions.analysis && (
              <div className="text-sm text-text-secondary bg-background-secondary/50 rounded-lg p-3">
                {suggestions.analysis}
              </div>
            )}

            {suggestions.suggestions?.map((suggestion, idx) => (
              <div key={idx} className="bg-background-secondary/50 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="text-text-primary font-medium mb-1">
                      {suggestion.day}: {suggestion.originalSession}
                    </p>
                    <p className="text-text-secondary mb-1">
                      → {suggestion.suggestedChange}
                    </p>
                    <p className="text-text-muted text-xs">
                      {suggestion.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card bg-error/10 border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      {/* Detailed breakdown (collapsible) */}
      <details className="card">
        <summary className="cursor-pointer text-sm font-medium text-text-primary select-none">
          Detaljert oversikt
        </summary>

        <div className="mt-4 space-y-4">
          {/* Completed sessions */}
          {analysis.completed.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wide mb-2">
                ✓ Fullført som planlagt
              </h5>
              <div className="space-y-2">
                {analysis.completed.map((item, idx) => (
                  <div key={idx} className="text-sm bg-success/5 rounded-lg p-2">
                    <p className="text-text-primary">{item.planned.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified sessions */}
          {analysis.modified.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wide mb-2">
                ⚠ Modifisert
              </h5>
              <div className="space-y-2">
                {analysis.modified.map((item, idx) => (
                  <div key={idx} className="text-sm bg-warning/5 rounded-lg p-2">
                    <p className="text-text-primary">{item.planned.title}</p>
                    <ul className="text-text-muted text-xs mt-1 space-y-0.5">
                      {item.differences.notes.map((note, noteIdx) => (
                        <li key={noteIdx}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped sessions */}
          {analysis.skipped.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wide mb-2">
                ✗ Hoppet over
              </h5>
              <div className="space-y-2">
                {analysis.skipped.map((session, idx) => (
                  <div key={idx} className="text-sm bg-error/5 rounded-lg p-2">
                    <p className="text-text-primary">{session.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra sessions */}
          {analysis.extra.length > 0 && (
            <div>
              <h5 className="text-xs text-text-muted uppercase tracking-wide mb-2">
                + Ekstra økter
              </h5>
              <div className="space-y-2">
                {analysis.extra.map((workout, idx) => (
                  <div key={idx} className="text-sm bg-primary/5 rounded-lg p-2">
                    <p className="text-text-primary">
                      {workout.title || workout.type}
                    </p>
                    <p className="text-text-muted text-xs">
                      {workout.duration} min
                      {workout.running?.distance && ` • ${workout.running.distance} km`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
