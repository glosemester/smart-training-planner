import React from 'react'
import { Target, Calendar, Clock, FileText, Edit2, Activity, Sparkles } from 'lucide-react'
import StravaHistoryCard from './StravaHistoryCard'

/**
 * Detaljert oppsummeringskomponent for wizard
 * Viser alle valg med mulighet for å gå tilbake og endre
 */
export default function SummaryStep({
    answers,
    stravaAnalysis,
    onEditStep,
    onGenerate,
    isGenerating = false
}) {
    // Hjelpefunksjoner for å formatere verdier
    const formatGoalType = (type) => {
        const types = {
            'general_fitness': 'Generell form',
            'race': 'Konkurranse',
            'longer_distances': 'Lengre distanser',
            'faster': 'Bli raskere'
        }
        return types[type] || type
    }

    const formatDistance = (distance) => {
        const distances = {
            '5k': '5 km',
            '10k': '10 km',
            'half_marathon': 'Halvmaraton (21.1 km)',
            'marathon': 'Maraton (42.2 km)',
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

    const formatTimeOfDay = (time) => {
        const times = {
            'morning': 'Morgen',
            'lunch': 'Lunsj',
            'evening': 'Kveld',
            'flexible': 'Fleksibel'
        }
        return times[time] || time || 'Ikke valgt'
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

    // Beregn antall uker til konkurranse
    const getWeeksToRace = () => {
        if (!answers.goal?.date) return null
        const raceDate = new Date(answers.goal.date)
        const now = new Date()
        const diffMs = raceDate - now
        const diffWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))
        return diffWeeks > 0 ? diffWeeks : null
    }

    const weeksToRace = getWeeksToRace()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Bekreft dine valg
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Sjekk at alt ser riktig ut før vi genererer din treningsplan
                </p>
            </div>

            {/* Mål-seksjon */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Mål</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(2)} // Steg for mål
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatGoalType(answers.goal?.type)}
                        </span>
                    </div>

                    {answers.goal?.type === 'race' && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Distanse:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {answers.goal?.distance === 'custom'
                                        ? `${answers.goal?.customDistance} km`
                                        : formatDistance(answers.goal?.distance)
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Dato:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatDate(answers.goal?.date)}
                                    {weeksToRace && (
                                        <span className="text-gray-500 ml-1">
                                            ({weeksToRace} uker)
                                        </span>
                                    )}
                                </span>
                            </div>
                            {answers.goal?.targetTime && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Måltid:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {answers.goal.targetTime}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Tilgjengelighet-seksjon */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Tilgjengelighet</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(4)} // Steg for tilgjengelighet
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Dager per uke:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {answers.daysPerWeek || 'Ikke valgt'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Foretrukne dager:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatDays(answers.availableDays)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tidspunkt:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatTimeOfDay(answers.preferredTime)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Øktvarighet-seksjon */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Treningsøkter</h3>
                    </div>
                    <button
                        onClick={() => onEditStep(5)} // Steg for øktvarighet
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <Edit2 className="w-4 h-4" />
                        Endre
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Øktlengde:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatDuration(answers.maxSessionDuration)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Preferanser-seksjon (hvis utfylt) */}
            {answers.preferences && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Preferanser</h3>
                        </div>
                        <button
                            onClick={() => onEditStep(5)} // Samme steg som øktvarighet
                            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            <Edit2 className="w-4 h-4" />
                            Endre
                        </button>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                        "{answers.preferences}"
                    </p>
                </div>
            )}

            {/* Strava-data */}
            {stravaAnalysis && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Din treningshistorikk
                        </h3>
                    </div>
                    <StravaHistoryCard analysis={stravaAnalysis} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Denne dataen brukes til å lage en realistisk plan tilpasset ditt nivå
                    </p>
                </div>
            )}

            {/* Generer-knapp */}
            <div className="pt-4">
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-lg transition-all
                        ${isGenerating
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
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
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                        Din plan vil dekke {weeksToRace} uker frem til konkurransen
                    </p>
                )}
            </div>
        </div>
    )
}
