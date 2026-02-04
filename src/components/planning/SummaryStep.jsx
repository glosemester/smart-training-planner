import React from 'react'
import { Target, Calendar, Clock, FileText, Edit2, Activity, Sparkles, Dumbbell, Ban, TrendingUp } from 'lucide-react'
import StravaHistoryCard from './StravaHistoryCard'

/**
 * Calculate actual step index accounting for conditional steps
 * @param {string} stepId - The step ID to find
 * @param {object} answers - Current wizard answers
 * @param {array} allSteps - Complete wizardSteps array from PlanningWizard
 * @returns {number} Actual index in visible steps
 */
const getStepIndex = (stepId, answers, allSteps) => {
  const visibleSteps = allSteps.filter(step => {
    if (!step.showIf) return true
    return step.showIf(answers)
  })
  return visibleSteps.findIndex(s => s.id === stepId)
}

/**
 * Detaljert oppsummeringskomponent for wizard
 * Viser alle valg med mulighet for å gå tilbake og endre
 */
export default function SummaryStep({
    answers,
    stravaAnalysis,
    onEditStep,
    onGenerate,
    isGenerating = false,
    wizardSteps  // NY: Receive wizardSteps array
}) {
    // Hjelpefunksjoner for å formatere verdier
    const formatGoalType = (type) => {
        const types = {
            'general_fitness': 'Generell form',
            'race': 'Konkurranse',
            'distance': 'Lengre distanser',
            'speed': 'Bli raskere'
        }
        return types[type] || type
    }

    const formatDistance = (distance) => {
        const distances = {
            '5k': '5 km',
            '10k': '10 km',
            'half_marathon': 'Halvmaraton (21.1 km)',
            'marathon': 'Maraton (42.2 km)',
            '50k': 'Ultramaraton 50 km',
            '65k': 'Ultramaraton 65 km',
            '100k': 'Ultramaraton 100 km',
            'hyrox': 'Hyrox',
            'ultra': 'Ultramaraton'
        }
        return distances[distance] || distance
    }

    const formatDays = (days) => {
        const dayNames = {
            'monday': 'Man',
            'tuesday': 'Tir',
            'wednesday': 'Ons',
            'thursday': 'Tor',
            'friday': 'Fre',
            'saturday': 'Lør',
            'sunday': 'Søn'
        }
        if (!days || days.length === 0) return 'Ikke valgt'
        return days.map(d => dayNames[d] || d).join(', ')
    }

    const formatDuration = (duration) => {
        const durations = {
            '30-45': '30-45 min',
            '45-75': '45-75 min',
            '75-90': '75-90 min',
            '90+': '90+ min'
        }
        return durations[duration] || duration || 'Ikke valgt'
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Ikke valgt'
        const date = new Date(dateStr)
        return date.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const formatTrainingType = (type) => {
        if (type === 'running_only') return '🏃 Kun løping'
        if (type === 'hyrox_hybrid') return '💪 Hyrox / Hybrid'
        return 'Ikke valgt'
    }

    const formatVolumeMode = (startVolume) => {
        if (!startVolume) return 'Ikke valgt'
        if (startVolume.mode === 'strava') return '📊 Basert på Strava'
        if (startVolume.mode === 'manual') return `🔢 ${startVolume.kmPerWeek || 0} km, ${startVolume.hoursPerWeek || 0}t/uke`
        if (startVolume.mode === 'beginner') return '🚀 Fra scratch (15 km/uke)'
        return 'Ikke valgt'
    }

    // Beregn antall uker til konkurranse
    const getWeeksToRace = () => {
        if (!answers.raceDetails?.date) return null
        const raceDate = new Date(answers.raceDetails.date)
        const now = new Date()
        const diffMs = raceDate - now
        const diffWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))
        return diffWeeks > 0 ? diffWeeks : null
    }

    const weeksToRace = getWeeksToRace()

    // Beregn effektive treningsdager
    const effectiveTrainingDays = answers.availableDays?.filter(d => !answers.blockedDays?.includes(d)) || []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Bekreft dine valg
                </h2>
                <p className="text-text-muted">
                    Sjekk at alt ser riktig ut før vi genererer din treningsplan
                </p>
            </div>

            {/* Mål-seksjon */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        <h3 className="font-semibold text-white">Mål</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(2)}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Type:</span>
                        <span className="font-medium text-white">
                            {formatGoalType(answers.goal)}
                        </span>
                    </div>

                    {answers.raceDetails && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Distanse:</span>
                                <span className="font-medium text-white">
                                    {answers.raceDetails?.distance === 'custom'
                                        ? `${answers.raceDetails?.customDistance} km`
                                        : formatDistance(answers.raceDetails?.distance)
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Dato:</span>
                                <span className="font-medium text-white">
                                    {formatDate(answers.raceDetails?.date)}
                                    {weeksToRace && (
                                        <span className="text-primary ml-1">
                                            ({weeksToRace} uker)
                                        </span>
                                    )}
                                </span>
                            </div>
                            {answers.raceDetails?.targetTime && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Måltid:</span>
                                    <span className="font-medium text-white">
                                        {answers.raceDetails.targetTime}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ========== NYE SEKSJONER ========== */}

            {/* Treningstype-seksjon */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Type trening</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(getStepIndex('trainingType', answers, wizardSteps))}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Treningstype:</span>
                        <span className="font-medium text-white">
                            {formatTrainingType(answers.trainingType)}
                        </span>
                    </div>
                </div>

                {answers.trainingType === 'running_only' && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-300">
                            ℹ️ Planen vil kun inneholde løpeøkter
                        </p>
                    </div>
                )}
            </div>

            {/* Økter & Dager-seksjon */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-400" />
                        <h3 className="font-semibold text-white">Økter & Dager</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(getStepIndex('sessionsPerWeek', answers, wizardSteps))}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Økter per uke:</span>
                        <span className="font-bold text-primary text-lg">
                            {answers.sessionsPerWeek}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Treningsdager:</span>
                        <span className="font-medium text-white">
                            {formatDays(effectiveTrainingDays)}
                        </span>
                    </div>
                    {answers.blockedDays?.length > 0 && (
                        <div className="flex justify-between">
                            <span className="text-text-muted flex items-center gap-1">
                                <Ban size={12} className="text-red-400" />
                                Blokkerte dager:
                            </span>
                            <span className="font-medium text-red-400">
                                {formatDays(answers.blockedDays)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Startvolum-seksjon */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        <h3 className="font-semibold text-white">Startvolum</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(getStepIndex('startVolume', answers, wizardSteps))}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Utgangspunkt:</span>
                        <span className="font-medium text-white">
                            {formatVolumeMode(answers.startVolume)}
                        </span>
                    </div>
                    {answers.startVolume?.mode === 'strava' && stravaAnalysis && (
                        <div className="flex justify-between">
                            <span className="text-text-muted">Fra Strava:</span>
                            <span className="font-medium text-primary">
                                {stravaAnalysis.weeklyAvgKm} km/uke
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ================================== */}

            {/* Øktvarighet-seksjon */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-semibold text-white">Øktlengde</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(getStepIndex('sessionDuration', answers, wizardSteps))}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Maks øktlengde:</span>
                        <span className="font-medium text-white">
                            {formatDuration(answers.maxSessionDuration)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Preferanser-seksjon (hvis utfylt) */}
            {answers.preferences && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-400" />
                            <h3 className="font-semibold text-white">Preferanser</h3>
                        </div>
                        <button
                            onClick={() => onEditStep(getStepIndex('sessionDuration', answers, wizardSteps))}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                            <Edit2 className="w-4 h-4" />
                            Endre
                        </button>
                    </div>

                    <p className="text-sm text-text-muted italic">
                        "{answers.preferences}"
                    </p>
                </div>
            )}

            {/* Strava-data */}
            {stravaAnalysis && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-white">
                            Din treningshistorikk
                        </h3>
                    </div>
                    <StravaHistoryCard analysis={stravaAnalysis} />
                </div>
            )}

            {/* Generer-knapp */}
            <div className="pt-4">
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-lg transition-all
                        ${isGenerating
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-primary to-lime-400 hover:shadow-lg hover:shadow-primary/30 text-primary-foreground'
                        }`}
                >
                    {isGenerating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Genererer treningsplan...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Generer treningsplan
                        </>
                    )}
                </button>

                {weeksToRace && (
                    <p className="text-center text-sm text-text-muted mt-3">
                        Din plan vil dekke <span className="text-primary font-bold">{weeksToRace} uker</span> frem til konkurransen
                    </p>
                )}
            </div>
        </div>
    )
}
