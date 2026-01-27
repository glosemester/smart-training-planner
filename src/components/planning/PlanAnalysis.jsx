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
    if (completionRate >= 80) return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' }
    if (completionRate >= 50) return { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' }
    return { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-100 dark:border-red-500/20', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' }
  }

  const statusColors = getStatusColor()

  // Sjekk om vi bør vise forslag
  const shouldShowSuggestion =
    analysis.skipped.length >= 2 ||
    Math.abs(analysis.totalLoadDiff.runningKm) > 5 ||
    analysis.extra.length >= 2

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={`card ${statusColors.bg} ${statusColors.border}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-medium ${statusColors.text} mb-2`}>
              Ukens gjennomføring
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {generateSummary(analysis)}
            </p>

            {/* Completion rate */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Fullført</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full ${statusColors.bar} transition-all duration-500`}
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
        <div className="card bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Fullført</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {analysis.completed.length}
          </p>
        </div>

        {/* Skipped */}
        <div className="card bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-xs text-red-800 dark:text-red-300 font-medium">Hoppet over</span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {analysis.skipped.length}
          </p>
        </div>

        {/* Modified */}
        {analysis.modified.length > 0 && (
          <div className="card bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">Modifisert</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {analysis.modified.length}
            </p>
          </div>
        )}

        {/* Extra */}
        {analysis.extra.length > 0 && (
          <div className="card bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <PlusCircle size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">Ekstra</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {analysis.extra.length}
            </p>
          </div>
        )}
      </div>

      {/* Load difference */}
      {Math.abs(analysis.totalLoadDiff.runningKm) > 2 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            {analysis.totalLoadDiff.runningKm > 0 ? (
              <TrendingUp size={16} className="text-emerald-500" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )}
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Belastning vs plan
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Løping</span>
              <span className={`font-medium ${analysis.totalLoadDiff.runningKm > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {analysis.totalLoadDiff.runningKm > 0 ? '+' : ''}
                {analysis.totalLoadDiff.runningKm.toFixed(1)} km
              </span>
            </div>
            {analysis.totalLoadDiff.strengthSessions !== 0 && (
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Styrke</span>
                <span className={`font-medium ${analysis.totalLoadDiff.strengthSessions > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {analysis.totalLoadDiff.strengthSessions > 0 ? '+' : ''}
                  {analysis.totalLoadDiff.strengthSessions} økter
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestion callout */}
      {shouldShowSuggestion && !suggestions && (
        <div className="card bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-purple-900 dark:text-purple-100 mb-3 font-medium">
                {analysis.skipped.length >= 2
                  ? `Du hoppet over ${analysis.skipped.length} økter denne uken. Vil du justere neste ukes plan?`
                  : 'Din gjennomføring avviker fra planen. Vil du ha AI-forslag til justeringer?'}
              </p>
              <button
                onClick={handleGetSuggestions}
                disabled={loading}
                className="btn-secondary text-sm bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 border-purple-200 dark:border-purple-500/30"
              >
                {loading ? (
                  <div className="spinner border-purple-600 border-2" />
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
        <div className="card bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
            <h4 className="font-bold text-purple-900 dark:text-purple-100">AI-forslag til justeringer</h4>
          </div>

          <div className="space-y-3">
            {suggestions.analysis && (
              <div className="text-sm text-purple-800 dark:text-purple-200 bg-white/50 dark:bg-black/20 rounded-lg p-3">
                {suggestions.analysis}
              </div>
            )}

            {suggestions.suggestions?.map((suggestion, idx) => (
              <div key={idx} className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      {suggestion.day}: {suggestion.originalSession}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mb-1">
                      → {suggestion.suggestedChange}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs italic">
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
        <div className="card bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Detailed breakdown (collapsible) */}
      <details className="card group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 select-none flex items-center justify-between">
          <span>Detaljert oversikt</span>
          <div className="group-open:rotate-180 transition-transform">
            <TrendingDown size={14} />
          </div>
        </summary>

        <div className="mt-4 space-y-4 pt-4 border-t border-gray-100 dark:border-white/5 animate-fade-in">
          {/* Completed sessions */}
          {analysis.completed.length > 0 && (
            <div>
              <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" />
                Fullført som planlagt
              </h5>
              <div className="space-y-2">
                {analysis.completed.map((item, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                    <p className="text-gray-900 dark:text-white font-medium">{item.planned.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified sessions */}
          {analysis.modified.length > 0 && (
            <div>
              <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertCircle size={10} className="text-amber-500" />
                Modifisert
              </h5>
              <div className="space-y-2">
                {analysis.modified.map((item, idx) => (
                  <div key={idx} className="text-sm bg-amber-50 dark:bg-amber-500/5 rounded-lg p-3">
                    <p className="text-gray-900 dark:text-white font-medium">{item.planned.title}</p>
                    <ul className="text-amber-700 dark:text-amber-400 text-xs mt-1 space-y-0.5">
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
              <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <XCircle size={10} className="text-red-500" />
                Hoppet over
              </h5>
              <div className="space-y-2">
                {analysis.skipped.map((session, idx) => (
                  <div key={idx} className="text-sm bg-red-50 dark:bg-red-500/5 rounded-lg p-3 opacity-75">
                    <p className="text-gray-900 dark:text-white font-medium line-through">{session.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra sessions */}
          {analysis.extra.length > 0 && (
            <div>
              <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <PlusCircle size={10} className="text-blue-500" />
                Ekstra økter
              </h5>
              <div className="space-y-2">
                {analysis.extra.map((workout, idx) => (
                  <div key={idx} className="text-sm bg-blue-50 dark:bg-blue-500/5 rounded-lg p-3">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {workout.title || workout.type}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
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
