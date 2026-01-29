import React, { useEffect, useState } from 'react'
import { X, Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, ChevronRight, Clock, Target, Flame } from 'lucide-react'
import { useWorkoutTimer, parseSessionToWorkout, formatTimerDisplay } from '../../hooks/useWorkoutTimer'

/**
 * LiveWorkout - Fullscreen workout timer with interval tracking
 * Inspired by Runna app - shows countdown, phase info, and instructions
 */
export default function LiveWorkout({ session, onComplete, onCancel }) {
    const timer = useWorkoutTimer()
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [showExitConfirm, setShowExitConfirm] = useState(false)

    // Initialize workout on mount
    useEffect(() => {
        if (session) {
            const workoutConfig = parseSessionToWorkout(session)
            timer.initWorkout(workoutConfig)
        }
    }, [session])

    // Get phase colors
    const getPhaseColor = (phase) => {
        switch (phase) {
            case 'warmup':
                return 'from-yellow-500 to-orange-500'
            case 'work':
                return 'from-red-500 to-pink-600'
            case 'rest':
                return 'from-green-500 to-teal-500'
            case 'cooldown':
                return 'from-blue-500 to-indigo-500'
            case 'complete':
                return 'from-purple-500 to-pink-500'
            default:
                return 'from-gray-600 to-gray-700'
        }
    }

    const getPhaseName = (phase) => {
        switch (phase) {
            case 'warmup': return 'OPPVARMING'
            case 'work': return 'ARBEID'
            case 'rest': return 'PAUSE'
            case 'cooldown': return 'NEDKJØLING'
            case 'complete': return 'FERDIG!'
            default: return 'KLAR'
        }
    }

    // Calculate progress for current phase
    const phaseProgress = timer.currentPhaseInfo
        ? ((timer.currentPhaseInfo.duration - timer.timeRemaining) / timer.currentPhaseInfo.duration) * 100
        : 0

    // Calculate overall progress
    const overallProgress = timer.workout
        ? (timer.elapsedTime / timer.workout.totalDuration) * 100
        : 0

    // Handle exit with confirmation
    const handleExit = () => {
        if (timer.phase !== 'idle' && timer.phase !== 'complete') {
            setShowExitConfirm(true)
        } else {
            onCancel?.()
        }
    }

    const confirmExit = () => {
        timer.reset()
        onCancel?.()
    }

    // Handle workout complete
    const handleComplete = () => {
        onComplete?.({
            duration: Math.round(timer.elapsedTime / 60),
            intervalsCompleted: timer.currentInterval,
            totalIntervals: timer.totalIntervals
        })
    }

    return (
        <div className={`fixed inset-0 z-[100] bg-gradient-to-br ${getPhaseColor(timer.phase)} text-white flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 safe-area-top">
                <button
                    onClick={handleExit}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Avslutt"
                >
                    <X size={24} />
                </button>

                <h1 className="font-bold text-lg truncate max-w-[60%]">
                    {timer.workout?.title || session?.title}
                </h1>

                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label={soundEnabled ? 'Slå av lyd' : 'Slå på lyd'}
                >
                    {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>
            </div>

            {/* Main timer display */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                {/* Phase indicator */}
                <div className="mb-4">
                    <span className="text-white/80 text-xl font-medium tracking-widest">
                        {getPhaseName(timer.phase)}
                    </span>
                </div>

                {/* Big timer */}
                <div className="text-8xl sm:text-9xl font-mono font-bold tracking-tight mb-4">
                    {timer.phase === 'idle'
                        ? formatTimerDisplay(timer.workout?.totalDuration || 0)
                        : formatTimerDisplay(timer.timeRemaining)
                    }
                </div>

                {/* Interval counter */}
                {timer.totalIntervals > 0 && timer.phase !== 'idle' && timer.phase !== 'complete' && (
                    <div className="flex items-center gap-2 text-white/80 text-xl mb-6">
                        <Target size={20} />
                        <span>
                            Intervall {timer.currentInterval} / {timer.totalIntervals}
                        </span>
                    </div>
                )}

                {/* Phase progress bar */}
                {timer.phase !== 'idle' && timer.phase !== 'complete' && (
                    <div className="w-full max-w-md mb-8">
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-1000 ease-linear rounded-full"
                                style={{ width: `${phaseProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Current instruction */}
                {timer.currentPhaseInfo && timer.phase !== 'idle' && (
                    <div className="text-center px-4 mb-8">
                        <p className="text-xl sm:text-2xl font-medium text-white/90">
                            {timer.currentPhaseInfo.instruction}
                        </p>
                    </div>
                )}

                {/* Next phase preview */}
                {timer.workout && timer.currentPhaseInfo && timer.phase !== 'complete' && (
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                        <span>Neste:</span>
                        {timer.workout.phases[timer.workout.phases.indexOf(timer.currentPhaseInfo) + 1]?.label || 'Ferdig'}
                        <ChevronRight size={16} />
                    </div>
                )}

                {/* Completed state */}
                {timer.phase === 'complete' && (
                    <div className="text-center space-y-4">
                        <div className="text-6xl mb-4">🎉</div>
                        <p className="text-2xl font-bold">Bra jobba!</p>
                        <div className="flex items-center justify-center gap-6 text-white/80 mt-4">
                            <div className="flex items-center gap-2">
                                <Clock size={20} />
                                <span>{formatTimerDisplay(timer.elapsedTime)}</span>
                            </div>
                            {timer.totalIntervals > 0 && (
                                <div className="flex items-center gap-2">
                                    <Flame size={20} />
                                    <span>{timer.currentInterval} intervaller</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 safe-area-bottom">
                {/* Overall progress */}
                {timer.phase !== 'idle' && timer.phase !== 'complete' && (
                    <div className="mb-6">
                        <div className="flex justify-between text-sm text-white/60 mb-2">
                            <span>Total fremgang</span>
                            <span>{Math.round(overallProgress)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white/60 transition-all duration-1000 rounded-full"
                                style={{ width: `${Math.min(overallProgress, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Control buttons */}
                <div className="flex items-center justify-center gap-6">
                    {timer.phase === 'idle' && (
                        <button
                            onClick={timer.start}
                            className="flex items-center justify-center gap-3 bg-white text-gray-900 py-4 px-8 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                        >
                            <Play size={24} fill="currentColor" />
                            Start trening
                        </button>
                    )}

                    {timer.phase !== 'idle' && timer.phase !== 'complete' && (
                        <>
                            {/* Reset */}
                            <button
                                onClick={timer.reset}
                                className="p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                aria-label="Start på nytt"
                            >
                                <RotateCcw size={24} />
                            </button>

                            {/* Play/Pause */}
                            <button
                                onClick={timer.isPaused ? timer.resume : timer.pause}
                                className="p-6 bg-white text-gray-900 rounded-full shadow-lg hover:scale-105 transition-transform"
                                aria-label={timer.isPaused ? 'Fortsett' : 'Pause'}
                            >
                                {timer.isPaused ? (
                                    <Play size={32} fill="currentColor" />
                                ) : (
                                    <Pause size={32} fill="currentColor" />
                                )}
                            </button>

                            {/* Skip */}
                            <button
                                onClick={timer.skip}
                                className="p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                aria-label="Hopp over"
                            >
                                <SkipForward size={24} />
                            </button>
                        </>
                    )}

                    {timer.phase === 'complete' && (
                        <button
                            onClick={handleComplete}
                            className="flex items-center justify-center gap-3 bg-white text-gray-900 py-4 px-8 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                        >
                            Fullfør og logg
                        </button>
                    )}
                </div>
            </div>

            {/* Exit confirmation modal */}
            {showExitConfirm && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-6 z-10">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-gray-900 dark:text-white">
                        <h3 className="text-xl font-bold mb-2">Avslutte trening?</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Din fremgang vil ikke bli lagret hvis du avslutter nå.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Fortsett
                            </button>
                            <button
                                onClick={confirmExit}
                                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                            >
                                Avslutt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
