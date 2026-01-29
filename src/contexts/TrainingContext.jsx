import { createContext, useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  limit
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'

export const TrainingContext = createContext(null)

export function TrainingProvider({ children }) {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [plans, setPlans] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Hent treningsøkter når bruker er innlogget
  useEffect(() => {
    if (!user) {
      setWorkouts([])
      setPlans([])
      setCurrentPlan(null)
      setLoading(false)
      return
    }

    setLoading(true)

    // Lytt til workouts (siste 100)
    const workoutsQuery = query(
      collection(db, 'users', user.uid, 'workouts'),
      orderBy('date', 'desc'),
      limit(100)
    )

    const unsubscribeWorkouts = onSnapshot(
      workoutsQuery,
      (snapshot) => {
        const workoutData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date)
        }))
        setWorkouts(workoutData)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching workouts:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    // Lytt til plans (siste 100 uker - støtter lange planer)
    const plansQuery = query(
      collection(db, 'users', user.uid, 'plans'),
      orderBy('weekStart', 'desc'),
      limit(100)
    )

    const unsubscribePlans = onSnapshot(
      plansQuery,
      (snapshot) => {
        const planData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          weekStart: doc.data().weekStart?.toDate?.() || new Date(doc.data().weekStart)
        }))
        setPlans(planData)

        // Finn gjeldende ukes plan
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Helper func for date comparison
        const isDateInWeek = (date, start) => {
          const s = new Date(start)
          s.setHours(0, 0, 0, 0)
          const e = new Date(s)
          e.setDate(e.getDate() + 7)
          return date >= s && date < e
        }

        // 1. Prøv å finne en plan som er aktiv IDAG
        let current = planData.find(plan => isDateInWeek(today, plan.weekStart))

        // DEBUG: Log plan selection
        console.debug('[TrainingContext] Plan selection:', {
          today: today.toISOString(),
          totalPlans: planData.length,
          allWeekStarts: planData.slice(0, 5).map(p => ({
            weekNumber: p.weekNumber,
            weekStart: p.weekStart?.toISOString?.() || p.weekStart,
            isCurrentWeek: isDateInWeek(today, p.weekStart)
          })),
          foundActiveToday: !!current
        })

        // 2. Hvis ingen aktiv plan, finn nærmeste FREMTIDIGE plan
        // Dette løser problemet med at man lager en plan for neste uke og den forsvinner
        if (!current) {
          const futurePlans = planData
            .filter(plan => {
              const start = new Date(plan.weekStart)
              start.setHours(0, 0, 0, 0)
              return start > today
            })
            .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart))

          if (futurePlans.length > 0) {
            console.debug('[TrainingContext] Fallback til fremtidig plan:', futurePlans[0].weekNumber)
            current = futurePlans[0]
          }
        }

        // 3. Fallback: Hvis vi fortsatt ikke har en plan, men har data, vis den aller nyeste (siste utvei)
        if (!current && planData.length > 0) {
          // planData er hentet med orderBy weekStart desc
          console.debug('[TrainingContext] Siste fallback til nyeste plan:', planData[0].weekNumber)
          current = planData[0]
        }

        setCurrentPlan(current || null)
      },
      (err) => {
        console.error('Error fetching plans:', err)
      }
    )

    return () => {
      unsubscribeWorkouts()
      unsubscribePlans()
    }
  }, [user])

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
      return docRef.id
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user])

  // Oppdater treningsøkt
  const updateWorkout = useCallback(async (workoutId, updates) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const workoutRef = doc(db, 'users', user.uid, 'workouts', workoutId)
      await updateDoc(workoutRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user])

  // Slett treningsøkt
  const deleteWorkout = useCallback(async (workoutId) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'workouts', workoutId))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user])

  // Lagre treningsplan
  const savePlan = useCallback(async (planData) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const weekStartDate = new Date(planData.weekStart)
      weekStartDate.setHours(0, 0, 0, 0)

      // Sjekk om det finnes en eksisterende plan for samme uke
      const existingPlan = plans.find(plan => {
        const planWeekStart = plan.weekStart?.toDate?.() || new Date(plan.weekStart)
        planWeekStart.setHours(0, 0, 0, 0)
        return planWeekStart.getTime() === weekStartDate.getTime()
      })

      let savedId;
      const planToSave = {
        ...planData,
        weekStart: Timestamp.fromDate(weekStartDate), // Firestore format
        lastModified: Timestamp.now()
      }

      if (existingPlan) {
        // Oppdater eksisterende plan
        const planRef = doc(db, 'users', user.uid, 'plans', existingPlan.id)
        await updateDoc(planRef, planToSave)
        savedId = existingPlan.id
      } else {
        // Opprett ny plan
        const docRef = await addDoc(
          collection(db, 'users', user.uid, 'plans'),
          {
            ...planToSave,
            generatedAt: Timestamp.now()
          }
        )
        savedId = docRef.id
      }

      // OPTIMISTISK OPPDATERING AV LOKAL STATE
      // Dette gjør at vi ikke trenger å vente på round-trip fra onSnapshot
      const newPlanLocal = {
        ...planData,
        id: savedId,
        weekStart: weekStartDate, // Date objekt lokalt
        lastModified: new Date()
      }

      setPlans(prevPlans => {
        // Fjern eksisterende versjon av denne uken hvis den finnes, og legg til den nye
        const filtered = prevPlans.filter(p => p.id !== savedId)
        // Sortere på nytt ville vært bra, men vi legger den bare til for nå
        // onSnapshot vil rydde opp sorteringen senere
        return [...filtered, newPlanLocal]
      })

      // Oppdater også currentPlan hvis denne uken treffer "i dag"
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thisNextWeek = new Date(weekStartDate)
      thisNextWeek.setDate(thisNextWeek.getDate() + 7)

      if (today >= weekStartDate && today < thisNextWeek) {
        console.log('Immediate update of currentPlan:', newPlanLocal)
        setCurrentPlan(newPlanLocal)
      }

      return savedId

    } catch (err) {
      console.error('savePlan CRITICAL ERROR:', err)
      console.error('Error info:', {
        code: err.code,
        message: err.message,
        details: err.details
      })

      let userMessage = 'Kunne ikke lagre planen.'
      if (err.code === 'permission-denied') userMessage = 'Ingen, tilgang til å lagre database.'
      if (err.code === 'unavailable') userMessage = 'Ingen nettverkstilgang til database.'

      setError(`${userMessage} (${err.message})`)
      throw err
    }
  }, [user, plans])

  // Lagre flere uker samtidig (batch/parallelt)
  // VIKTIG: Sletter alle eksisterende planer før nye lagres
  const saveMultipleWeeks = useCallback(async (weeksArray) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      // 1. Slett alle eksisterende planer først
      if (plans.length > 0) {
        console.log(`[TrainingContext] Sletter ${plans.length} eksisterende planer før ny plan lagres...`)
        const deletePromises = plans.map(plan =>
          deleteDoc(doc(db, 'users', user.uid, 'plans', plan.id))
        )
        await Promise.all(deletePromises)
        console.log('[TrainingContext] Gamle planer slettet.')
      }

      // 2. Lagre alle nye uker parallelt
      const promises = weeksArray.map(week => savePlan(week))
      await Promise.all(promises)
      console.log(`[TrainingContext] ${weeksArray.length} nye uker lagret.`)

      // onSnapshot vil automatisk oppdatere plans-staten
    } catch (err) {
      console.error('saveMultipleWeeks failed:', err)
      setError(err.message)
      throw err
    }
  }, [user, plans, savePlan])

  // Oppdater treningsplan
  const updatePlan = useCallback(async (planId, updates) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const planRef = doc(db, 'users', user.uid, 'plans', planId)
      await updateDoc(planRef, {
        ...updates,
        lastModified: Timestamp.now()
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user])

  // Oppdater en økt i en plan
  const updatePlanSession = useCallback(async (planId, sessionId, updates) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      // Hent gjeldende plan
      const plan = plans.find(p => p.id === planId)
      if (!plan) throw new Error('Plan ikke funnet')

      // Oppdater økten
      const updatedSessions = plan.sessions.map(session =>
        session.id === sessionId
          ? { ...session, ...updates }
          : session
      )

      // Lagre tilbake til Firestore
      await updatePlan(planId, { sessions: updatedSessions })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user, plans, updatePlan])

  // Legg til ny økt i plan
  const addPlanSession = useCallback(async (planId, session) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan) throw new Error('Plan ikke funnet')

      const newSession = {
        id: `custom-${Date.now()}`,
        ...session,
        status: 'planned',
        movedBy: 'user',
        movedAt: new Date()
      }

      const updatedSessions = [...plan.sessions, newSession]
      await updatePlan(planId, { sessions: updatedSessions })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user, plans, updatePlan])

  // Slett økt fra plan
  const deletePlanSession = useCallback(async (planId, sessionId) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan) throw new Error('Plan ikke funnet')

      const updatedSessions = plan.sessions.filter(s => s.id !== sessionId)
      await updatePlan(planId, { sessions: updatedSessions })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user, plans, updatePlan])

  // Slett ALLE planer (for opprydding)
  const deleteAllPlans = useCallback(async () => {
    if (!user) throw new Error('Ikke innlogget')
    if (plans.length === 0) return

    try {
      console.log(`[TrainingContext] Sletter ${plans.length} planer...`)
      const deletePromises = plans.map(plan =>
        deleteDoc(doc(db, 'users', user.uid, 'plans', plan.id))
      )
      await Promise.all(deletePromises)
      console.log('[TrainingContext] Alle planer slettet.')
    } catch (err) {
      console.error('deleteAllPlans failed:', err)
      setError(err.message)
      throw err
    }
  }, [user, plans])

  // Hent statistikk for periode
  const getStats = useCallback((days = 28) => {
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
      // Total varighet
      stats.totalDuration += workout.duration || 0

      // Løping km
      if (workout.running?.distance) {
        stats.totalRunningKm += workout.running.distance
      }

      // Per type
      const type = workout.type || 'other'
      stats.workoutsByType[type] = (stats.workoutsByType[type] || 0) + 1

      // RPE
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

  const value = {
    workouts,
    plans,
    currentPlan,
    setCurrentPlan, // Allow week navigation
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
    deleteAllPlans, // Manual cleanup
    getStats
  }

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  )
}
