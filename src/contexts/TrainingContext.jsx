import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkouts } from '../hooks/queries/useWorkouts'
import { useTrainingPlans } from '../hooks/queries/useTrainingPlan'
import { useGoals } from '../hooks/queries/useGoals'
import { aiMentalModel } from '../services/ai/MentalStateService'
import { WhoopService } from '../services/WhoopService'
import { awardWorkoutXP, BADGES } from '../services/gamificationService'
import toast from 'react-hot-toast'

export const TrainingContext = createContext(null)

export const useTraining = () => {
  const context = useContext(TrainingContext)
  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider')
  }
  return context
}

export function TrainingProvider({ children }) {
  const { user, userProfile } = useAuth()
  const queryClient = useQueryClient()
  const functions = getFunctions()

  // Queries
  const { data: workouts = [], isLoading: workoutsLoading, error: workoutsError } = useWorkouts()
  const { data: plans = [], isLoading: plansLoading, error: plansError } = useTrainingPlans()
  const { goals } = useGoals()

  const loading = workoutsLoading || plansLoading
  const error = workoutsError || plansError ? (workoutsError?.message || plansError?.message) : null

  // UI State for selected plan (Week Navigation)
  const [selectedPlanId, setSelectedPlanId] = useState(null)

  // UI State for Global Chat
  const [isChatOpen, setChatOpen] = useState(false)
  const [chatInitialMessage, setChatInitialMessage] = useState(null)

  // Whoop Data State
  const [whoopData, setWhoopData] = useState(null)

  // Fetch Whoop Data if connected
  useEffect(() => {
    const fetchWhoop = async () => {
      if (userProfile?.integrations?.whoop?.isConnected) {
        try {
          const data = await WhoopService.getWeeklySummary();
          // Transform/Simplify if needed, or pass raw
          // We mainly need the latest recovery/sleep
          const latestRecovery = data.recovery?.[0];
          const latestSleep = data.sleep?.[0]; // Assuming sorted

          setWhoopData({
            recoveryScore: latestRecovery?.score?.recovery_score,
            sleepPerformance: latestSleep?.score?.sleep_performance_percentage,
            raw: data
          });
        } catch (err) {
          console.error("Failed to fetch Whoop for Context:", err);
          // Set null to indicate Whoop is not available
          setWhoopData(null);
        }
      }
    };

    if (userProfile) {
      fetchWhoop();
    }
  }, [userProfile]);


  const openChat = (message = null) => {
    setChatOpen(true)
    if (message) setChatInitialMessage(message)
  }

  // Derived Current Plan Logic
  const currentPlan = useMemo(() => {
    if (plans.length === 0) return null

    // 1. If user selected a specific plan, return it
    if (selectedPlanId) {
      const found = plans.find(p => p.id === selectedPlanId)
      if (found) return found
    }

    // 2. Default logic: Active today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const isDateInWeek = (date, start) => {
      const s = new Date(start)
      s.setHours(0, 0, 0, 0)
      const e = new Date(s)
      e.setDate(e.getDate() + 7)
      return date >= s && date < e
    }

    let current = plans.find(plan => isDateInWeek(today, plan.weekStart))

    // 3. Nearest future plan
    if (!current) {
      const futurePlans = plans
        .filter(plan => {
          const start = new Date(plan.weekStart)
          start.setHours(0, 0, 0, 0)
          return start > today
        })
        .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart))

      if (futurePlans.length > 0) current = futurePlans[0]
    }

    // 4. Fallback to newest
    if (!current && plans.length > 0) {
      // plans are already sorted by weekStart desc in hook
      current = plans[0]
    }

    return current || null
  }, [plans, selectedPlanId])

  // Helper to set current plan by object (mimicking old API)
  const setCurrentPlan = useCallback((plan) => {
    setSelectedPlanId(plan ? plan.id : null)
  }, [])

  // MUTATIONS
  // Legg til ny treningsøkt
  const addWorkout = useCallback(async (workoutData) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const docRef = await addDoc(
        collection(db, 'users', user.uid, 'workouts'),
        {
          ...workoutData,
          images: workoutData.images || [],
          date: Timestamp.fromDate(new Date(workoutData.date)),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
      )

      // Award XP for completing workout
      try {
        // Try to get readiness score from Whoop
        let readiness = null
        try {
          const whoopData = await WhoopService.getRecovery()
          if (whoopData?.records?.[0]) {
            readiness = whoopData.records[0].score?.recovery_score
          }
        } catch (whoopErr) {
          // Whoop not connected or failed, continue without readiness
          console.log('Could not fetch readiness score:', whoopErr)
        }

        const xpResult = await awardWorkoutXP(user.uid, workoutData, readiness)

        // Show XP notification
        let message = `+${xpResult.xpGained} XP`
        if (xpResult.leveledUp) {
          message = `🎉 Nivå ${xpResult.newLevel}! +${xpResult.xpGained} XP`
          toast.success(message, { duration: 5000 })
        } else {
          toast.success(message, { duration: 3000 })
        }

        // Show badge notifications
        if (xpResult.newBadges.length > 0) {
          xpResult.newBadges.forEach(badgeId => {
            const badge = BADGES[badgeId]
            if (badge) {
              toast.success(`${badge.icon} Badge låst opp: ${badge.name}`, { duration: 5000 })
            }
          })
        }

        // Show streak notification
        if (xpResult.streakUpdate) {
          const emoji = xpResult.currentStreak >= 7 ? '🔥🔥' : '🔥'
          toast.success(`${emoji} ${xpResult.currentStreak} dagers streak!`, { duration: 4000 })
        }
      } catch (xpErr) {
        console.error('Failed to award XP:', xpErr)
        // Don't fail the workout save if XP awarding fails
      }

      // Refetch to ensure data is loaded
      await queryClient.refetchQueries(['workouts', user.uid])
      return docRef.id
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [user, queryClient])

  // Oppdater treningsøkt
  const updateWorkout = useCallback(async (workoutId, updates) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const workoutRef = doc(db, 'users', user.uid, 'workouts', workoutId)
      await updateDoc(workoutRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
      await queryClient.refetchQueries(['workouts', user.uid])
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [user, queryClient])

  // Slett treningsøkt
  const deleteWorkout = useCallback(async (workoutId) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'workouts', workoutId))
      await queryClient.refetchQueries(['workouts', user.uid])
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [user, queryClient])

  // Lagre treningsplan
  const savePlan = useCallback(async (planData) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const weekStartDate = new Date(planData.weekStart)
      weekStartDate.setHours(0, 0, 0, 0)

      // Check current plans from hook data
      const existingPlan = plans.find(plan => {
        const planWeekStart = plan.weekStart?.toDate?.() || new Date(plan.weekStart)
        planWeekStart.setHours(0, 0, 0, 0)
        return planWeekStart.getTime() === weekStartDate.getTime()
      })

      let savedId;

      // CRITICAL FIX: Add unique IDs to sessions if they don't have them
      const sessionsWithIds = planData.sessions?.map(session => ({
        ...session,
        id: session.id || crypto.randomUUID()
      })) || []

      const planToSave = {
        ...planData,
        sessions: sessionsWithIds,
        weekStart: Timestamp.fromDate(weekStartDate),
        lastModified: Timestamp.now()
      }

      if (existingPlan) {
        const planRef = doc(db, 'users', user.uid, 'plans', existingPlan.id)
        await updateDoc(planRef, planToSave)
        savedId = existingPlan.id
      } else {
        const docRef = await addDoc(
          collection(db, 'users', user.uid, 'plans'),
          {
            ...planToSave,
            generatedAt: Timestamp.now()
          }
        )
        savedId = docRef.id
      }

      // Refetch immediately to ensure data is loaded before returning
      await queryClient.refetchQueries(['plans', user.uid])

      return savedId

    } catch (err) {
      console.error('savePlan error:', err)
      throw err
    }
  }, [user, plans, queryClient])

  // Lagre flere uker
  const saveMultipleWeeks = useCallback(async (weeksArray) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      // 1. Delete existing
      if (plans.length > 0) {
        const deletePromises = plans.map(plan =>
          deleteDoc(doc(db, 'users', user.uid, 'plans', plan.id))
        )
        await Promise.all(deletePromises)
      }

      // 2. Save new
      // Note: reusing simple addDoc logic here instead of calling savePlan to avoid multiple invalidations
      // Actually calling savePlan is fine, but Promise.all is better
      // We will manually construct doc adds

      const promises = weeksArray.map(async (week) => {
        const weekStartDate = new Date(week.weekStart)
        weekStartDate.setHours(0, 0, 0, 0)

        // CRITICAL FIX: Add unique IDs to sessions if they don't have them
        // This enables drag-and-drop, editing, and deletion functionality
        const sessionsWithIds = week.sessions?.map(session => ({
          ...session,
          id: session.id || crypto.randomUUID()
        })) || []

        return addDoc(collection(db, 'users', user.uid, 'plans'), {
          ...week,
          sessions: sessionsWithIds,
          weekStart: Timestamp.fromDate(weekStartDate),
          generatedAt: Timestamp.now(),
          lastModified: Timestamp.now()
        })
      })

      await Promise.all(promises)

      // Refetch immediately to ensure data is loaded before returning
      await queryClient.refetchQueries(['plans', user.uid])

    } catch (err) {
      console.error('saveMultipleWeeks failed:', err)
      throw err
    }
  }, [user, plans, queryClient])

  // Oppdater plan
  const updatePlan = useCallback(async (planId, updates) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const planRef = doc(db, 'users', user.uid, 'plans', planId)
      await updateDoc(planRef, {
        ...updates,
        lastModified: Timestamp.now()
      })
      await queryClient.refetchQueries(['plans', user.uid])
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [user, queryClient])

  // Oppdater plan økt
  const updatePlanSession = useCallback(async (planId, sessionId, updates) => {
    // Re-using generic updatePlan would require fetching plan first... 
    // Optimized: Just use the plan from 'plans' data
    const plan = plans.find(p => p.id === planId)
    if (!plan) throw new Error('Plan ikke funnet')

    const updatedSessions = plan.sessions.map(session =>
      session.id === sessionId
        ? { ...session, ...updates }
        : session
    )

    await updatePlan(planId, { sessions: updatedSessions })
  }, [plans, updatePlan])

  // Add plan session
  const addPlanSession = useCallback(async (planId, session) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) throw new Error('Plan ikke funnet')

    const newSession = {
      ...session,
      id: session.id || crypto.randomUUID(), // Use crypto.randomUUID for consistency
      status: 'planned',
      movedBy: 'user',
      movedAt: new Date()
    }

    const updatedSessions = [...plan.sessions, newSession]
    await updatePlan(planId, { sessions: updatedSessions })
  }, [plans, updatePlan])

  // Delete plan session
  const deletePlanSession = useCallback(async (planId, sessionId) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) throw new Error('Plan ikke funnet')

    const updatedSessions = plan.sessions.filter(s => s.id !== sessionId)
    await updatePlan(planId, { sessions: updatedSessions })
  }, [plans, updatePlan])

  // Delete all plans
  const deleteAllPlans = useCallback(async () => {
    if (!user) throw new Error('Ikke innlogget')
    if (plans.length === 0) return

    try {
      const deletePromises = plans.map(plan =>
        deleteDoc(doc(db, 'users', user.uid, 'plans', plan.id))
      )
      await Promise.all(deletePromises)
      await queryClient.refetchQueries(['plans', user.uid])
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [user, plans, queryClient])

  // Get Stats
  const getStats = useCallback((days = 28) => {
    // Logic copied from original
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const recentWorkouts = workouts.filter(w => w.date >= cutoffDate)

    const stats = {
      totalWorkouts: recentWorkouts.length,
      totalRunningKm: 0,
      totalDuration: 0,
      workoutsByType: {},
      avgRPE: 0
    }

    let rpeSum = 0
    let rpeCount = 0

    recentWorkouts.forEach(workout => {
      stats.totalDuration += workout.duration || 0
      if (workout.running?.distance) stats.totalRunningKm += workout.running.distance
      const type = workout.type || 'other'
      stats.workoutsByType[type] = (stats.workoutsByType[type] || 0) + 1
      if (workout.rpe) {
        rpeSum += workout.rpe
        rpeCount++
      }
    })

    stats.avgRPE = rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : 0
    stats.totalRunningKm = Math.round(stats.totalRunningKm * 10) / 10
    stats.totalHours = Math.round(stats.totalDuration / 60 * 10) / 10

    return stats
  }, [workouts])

  // AI Mental Model
  const [mentalState, setMentalState] = useState(null)
  useEffect(() => {
    if (!loading && workouts.length > 0) {
      const stats = getStats(28)
      const now = new Date()
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
      const lastWeekWorkouts = workouts.filter(w => new Date(w.date) > oneWeekAgo)
      const weeklyLoad = lastWeekWorkouts.reduce((sum, w) => sum + (w.rpe || 5) * (w.duration || 30), 0)
      const chronicLoad = weeklyLoad * 0.9

      const context = {
        recentWorkouts: workouts.slice(0, 10),
        stats: { ...stats, acuteLoad: weeklyLoad, chronicLoad },
        currentPlan,
        goals: goals || [],
        whoop: whoopData // Feed Whoop data!
      }

      // Use the static service instance
      if (aiMentalModel) {
        const newState = aiMentalModel.assessSituation(context)
        setMentalState(newState)
      }
    }
  }, [workouts, currentPlan, loading, getStats, whoopData, goals])

  // ============================================
  // FASE 4: Enhanced Adaptive Engine Integration
  // ============================================

  /**
   * Get daily recommendation from Enhanced Adaptive Engine
   * Uses personalized recovery patterns and ML predictions
   */
  const getDailyRecommendation = useCallback(async () => {
    if (!user?.uid) throw new Error('Ikke innlogget')

    try {
      const generateDailyRecommendation = httpsCallable(functions, 'generateDailyRecommendation')

      const result = await generateDailyRecommendation({
        userId: user.uid,
        context: {
          todaysWorkout: currentPlan?.sessions?.find(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })),
          currentPhase: currentPlan?.phase || 'base',
          raceDistance: userProfile?.raceDistance,
          weeksToRace: userProfile?.raceDate ?
            Math.ceil((new Date(userProfile.raceDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)) : null
        }
      })

      return result.data
    } catch (err) {
      console.error('Failed to get daily recommendation:', err)
      throw err
    }
  }, [user?.uid, currentPlan, userProfile, functions])

  /**
   * Get comprehensive athlete insights
   * Combines all Fase 1-3 analytics
   */
  const getAthleteInsights = useCallback(async () => {
    if (!user?.uid) throw new Error('Ikke innlogget')

    try {
      const getInsights = httpsCallable(functions, 'getAthleteInsights')
      const result = await getInsights({ userId: user.uid })
      return result.data
    } catch (err) {
      console.error('Failed to get athlete insights:', err)
      throw err
    }
  }, [user?.uid, functions])

  /**
   * Get race performance prediction
   */
  const getRacePrediction = useCallback(async (raceDate, raceDistance) => {
    if (!user?.uid) throw new Error('Ikke innlogget')

    try {
      const predictRacePerformance = httpsCallable(functions, 'predictRacePerformance')
      const result = await predictRacePerformance({
        userId: user.uid,
        raceDate: raceDate || userProfile?.raceDate,
        raceDistance: raceDistance || userProfile?.raceDistance
      })
      return result.data
    } catch (err) {
      console.error('Failed to get race prediction:', err)
      throw err
    }
  }, [user?.uid, userProfile, functions])

  /**
   * Get injury risk assessment
   */
  const getInjuryRisk = useCallback(async () => {
    if (!user?.uid) throw new Error('Ikke innlogget')

    try {
      const assessInjuryRisk = httpsCallable(functions, 'assessInjuryRisk')
      const result = await assessInjuryRisk({ userId: user.uid })
      return result.data
    } catch (err) {
      console.error('Failed to get injury risk:', err)
      throw err
    }
  }, [user?.uid, functions])

  /**
   * Get workout recommendation for next session
   */
  const getNextWorkoutRecommendation = useCallback(async (context) => {
    if (!user?.uid) throw new Error('Ikke innlogget')

    try {
      const recommendNextWorkout = httpsCallable(functions, 'recommendNextWorkout')
      const result = await recommendNextWorkout({
        userId: user.uid,
        context: {
          phase: context?.phase || currentPlan?.phase || 'base',
          recoveryScore: whoopData?.recoveryScore,
          raceDistance: userProfile?.raceDistance,
          weeksToRace: userProfile?.raceDate ?
            Math.ceil((new Date(userProfile.raceDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)) : null,
          ...context
        }
      })
      return result.data
    } catch (err) {
      console.error('Failed to get workout recommendation:', err)
      throw err
    }
  }, [user?.uid, currentPlan, userProfile, whoopData, functions])

  /**
   * Get performance analytics
   */
  const getPerformanceAnalytics = useCallback(async () => {
    if (!user?.uid) throw new Error('Ikke innlogget')

    try {
      const getAnalytics = httpsCallable(functions, 'getPerformanceAnalytics')
      const result = await getAnalytics({ userId: user.uid })
      return result.data
    } catch (err) {
      console.error('Failed to get performance analytics:', err)
      throw err
    }
  }, [user?.uid, functions])

  const value = {
    workouts,
    plans,
    currentPlan,
    setCurrentPlan,
    loading,
    error,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    savePlan,
    updatePlan,
    updatePlanSession,
    addPlanSession,
    saveMultipleWeeks,
    deletePlanSession,
    deleteAllPlans,
    getStats,
    mentalState,
    goals,
    isChatOpen,
    setChatOpen,
    openChat,
    chatInitialMessage,
    setChatInitialMessage,
    // Enhanced Adaptive Engine API
    getDailyRecommendation,
    getAthleteInsights,
    getRacePrediction,
    getInjuryRisk,
    getNextWorkoutRecommendation,
    getPerformanceAnalytics,
    whoopData
  }

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  )
}
