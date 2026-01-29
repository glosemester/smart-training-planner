import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Phase types for workout timer
 * idle: Not started
 * warmup: Warming up
 * work: Active work interval
 * rest: Rest period between intervals
 * cooldown: Cooling down
 * complete: Workout finished
 */

/**
 * Hook for managing live workout timer with intervals
 * Supports warmup, work/rest cycles, and cooldown phases
 */
export function useWorkoutTimer() {
    const [phase, setPhase] = useState('idle') // idle, warmup, work, rest, cooldown, complete
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [currentInterval, setCurrentInterval] = useState(0)
    const [totalIntervals, setTotalIntervals] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [workout, setWorkout] = useState(null)
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)

    // Audio context reference
    const audioContextRef = useRef(null)

    // Initialize audio context on first user interaction
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        // Resume if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume()
        }
        return audioContextRef.current
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    // Play beep sound using Web Audio API
    const playBeep = useCallback((frequency, duration, type = 'sine') => {
        try {
            const ctx = getAudioContext()
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            oscillator.type = type
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

            // Envelope for smooth sound
            gainNode.gain.setValueAtTime(0, ctx.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01)
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + duration)
        } catch (e) {
            console.warn('Audio playback failed:', e)
        }
    }, [getAudioContext])

    // Play sound helper - generates different beep patterns
    const playSound = useCallback((soundName) => {
        switch (soundName) {
            case 'start':
                // Ascending beeps: GO!
                playBeep(440, 0.15) // A4
                setTimeout(() => playBeep(554, 0.15), 150) // C#5
                setTimeout(() => playBeep(659, 0.3), 300) // E5
                break
            case 'rest':
                // Descending gentle tone
                playBeep(523, 0.2) // C5
                setTimeout(() => playBeep(392, 0.3), 200) // G4
                break
            case 'complete':
                // Victory fanfare
                playBeep(523, 0.15) // C5
                setTimeout(() => playBeep(659, 0.15), 150) // E5
                setTimeout(() => playBeep(784, 0.15), 300) // G5
                setTimeout(() => playBeep(1047, 0.4), 450) // C6
                break
            case 'countdown':
                // Simple tick
                playBeep(880, 0.08, 'square')
                break
            default:
                playBeep(440, 0.1)
        }
    }, [playBeep])

    // Handle phase transition
    const handlePhaseComplete = useCallback(() => {
        if (!workout || !workout.phases) return

        const nextIndex = currentPhaseIndex + 1

        if (nextIndex >= workout.phases.length) {
            // Workout complete
            setPhase('complete')
            setTimeRemaining(0)
            playSound('complete')
            return
        }

        const nextPhase = workout.phases[nextIndex]
        setCurrentPhaseIndex(nextIndex)
        setPhase(nextPhase.type)
        setTimeRemaining(nextPhase.duration)

        // Update interval counter for work phases
        if (nextPhase.type === 'work') {
            setCurrentInterval(prev => prev + 1)
            playSound('start')
        } else if (nextPhase.type === 'rest') {
            playSound('rest')
        }
    }, [workout, currentPhaseIndex, playSound])

    // Timer interval effect
    useEffect(() => {
        if (phase === 'idle' || phase === 'complete' || isPaused) return

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                // Play countdown beeps for last 3 seconds
                if (prev <= 4 && prev > 1) {
                    playSound('countdown')
                }

                if (prev <= 1) {
                    handlePhaseComplete()
                    return 0
                }
                return prev - 1
            })

            // Track total elapsed time
            setElapsedTime(prev => prev + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [phase, isPaused, handlePhaseComplete, playSound])

    // Initialize workout
    const initWorkout = useCallback((workoutConfig) => {
        setWorkout(workoutConfig)
        setPhase('idle')
        setTimeRemaining(0)
        setCurrentInterval(0)
        setTotalIntervals(workoutConfig.phases?.filter(p => p.type === 'work').length || 0)
        setCurrentPhaseIndex(0)
        setIsPaused(false)
        setElapsedTime(0)
    }, [])

    // Start workout
    const start = useCallback(() => {
        if (!workout || !workout.phases || workout.phases.length === 0) return

        const firstPhase = workout.phases[0]
        setPhase(firstPhase.type)
        setTimeRemaining(firstPhase.duration)
        setCurrentPhaseIndex(0)

        if (firstPhase.type === 'work') {
            setCurrentInterval(1)
        }

        playSound('start')
    }, [workout, playSound])

    // Pause/Resume
    const pause = useCallback(() => {
        setIsPaused(true)
    }, [])

    const resume = useCallback(() => {
        setIsPaused(false)
    }, [])

    // Skip to next phase
    const skip = useCallback(() => {
        handlePhaseComplete()
    }, [handlePhaseComplete])

    // Reset
    const reset = useCallback(() => {
        setPhase('idle')
        setTimeRemaining(0)
        setCurrentInterval(0)
        setCurrentPhaseIndex(0)
        setIsPaused(false)
        setElapsedTime(0)
    }, [])

    // Get current phase info
    const getCurrentPhaseInfo = useCallback(() => {
        if (!workout || !workout.phases || currentPhaseIndex >= workout.phases.length) {
            return null
        }
        return workout.phases[currentPhaseIndex]
    }, [workout, currentPhaseIndex])

    return {
        // State
        phase,
        timeRemaining,
        currentInterval,
        totalIntervals,
        isPaused,
        elapsedTime,
        workout,

        // Current phase details
        currentPhaseInfo: getCurrentPhaseInfo(),

        // Actions
        initWorkout,
        start,
        pause,
        resume,
        skip,
        reset,
        playSound
    }
}

/**
 * Parse a session description to extract workout structure
 * E.g. "5x1000m @ 4:30/km m/ 2 min pause" -> phases array
 */
export function parseSessionToWorkout(session) {
    const phases = []
    const description = session.description || ''
    const details = session.details || {}

    // Default warmup (10 minutes or from details)
    const warmupDuration = details.warmup_minutes || 10
    if (warmupDuration > 0) {
        phases.push({
            type: 'warmup',
            duration: warmupDuration * 60,
            label: 'Oppvarming',
            instruction: details.warmup || 'Rolig jogging for å varme opp'
        })
    }

    // Try to parse interval info from description
    // Common patterns: "5x1000m", "4x5min", "6x400m"
    const intervalMatch = description.match(/(\d+)\s*x\s*(\d+)\s*(m|km|min|sek)/i)

    if (intervalMatch) {
        const numIntervals = parseInt(intervalMatch[1])
        let workDuration = parseInt(intervalMatch[2])
        const unit = intervalMatch[3].toLowerCase()

        // Convert to seconds
        if (unit === 'min') {
            workDuration = workDuration * 60
        } else if (unit === 'km') {
            // Estimate based on target pace if available, otherwise ~5 min/km
            const paceMatch = description.match(/(\d+):(\d+)\s*\/?\s*(km|min)/i)
            if (paceMatch) {
                const paceSeconds = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2])
                workDuration = Math.round(workDuration * paceSeconds)
            } else {
                workDuration = workDuration * 300 // 5 min/km default
            }
        } else if (unit === 'm') {
            // Estimate: 1000m at ~4:30 = 270 sec, so roughly 0.27 sec/m
            const paceMatch = description.match(/(\d+):(\d+)\s*\/?\s*(km|min)/i)
            if (paceMatch) {
                const paceSecondsPerKm = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2])
                workDuration = Math.round((workDuration / 1000) * paceSecondsPerKm)
            } else {
                workDuration = Math.round(workDuration * 0.27) // ~4:30/km default
            }
        }

        // Parse rest duration
        const restMatch = description.match(/(\d+)\s*(min|sek|s)\s*(pause|hvile|rest)/i)
        let restDuration = 120 // Default 2 min
        if (restMatch) {
            restDuration = parseInt(restMatch[1])
            if (restMatch[2].toLowerCase() === 'min') {
                restDuration = restDuration * 60
            }
        }

        // Add intervals
        for (let i = 0; i < numIntervals; i++) {
            phases.push({
                type: 'work',
                duration: workDuration,
                label: `Intervall ${i + 1}/${numIntervals}`,
                instruction: details.target_pace ? `Mål: ${details.target_pace}/km` : 'Høy intensitet'
            })

            // Add rest between intervals (not after last one)
            if (i < numIntervals - 1) {
                phases.push({
                    type: 'rest',
                    duration: restDuration,
                    label: 'Pause',
                    instruction: 'Rolig jogg eller gange'
                })
            }
        }
    } else {
        // No interval pattern found - create single work phase
        const duration = (session.duration_minutes || 30) * 60
        phases.push({
            type: 'work',
            duration: duration,
            label: session.title || 'Trening',
            instruction: session.description || 'Følg planlagt tempo'
        })
    }

    // Add cooldown
    const cooldownDuration = details.cooldown_minutes || 5
    if (cooldownDuration > 0) {
        phases.push({
            type: 'cooldown',
            duration: cooldownDuration * 60,
            label: 'Nedkjøling',
            instruction: details.cooldown || 'Rolig jogging og uttøying'
        })
    }

    // Calculate totals
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0)
    const workPhases = phases.filter(p => p.type === 'work')

    return {
        title: session.title,
        type: session.type,
        phases,
        totalDuration,
        totalIntervals: workPhases.length,
        originalSession: session
    }
}

/**
 * Format seconds to mm:ss or hh:mm:ss display
 */
export function formatTimerDisplay(seconds) {
    if (seconds < 0) seconds = 0

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export default useWorkoutTimer
