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

    // Lytt til plans (siste 12 uker)
    const plansQuery = query(
      collection(db, 'users', user.uid, 'plans'),
      orderBy('weekStart', 'desc'),
      limit(12)
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
        const current = planData.find(plan => {
          const weekStart = plan.weekStart
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 7)
          return today >= weekStart && today < weekEnd
        })
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

      if (existingPlan) {
        // Oppdater eksisterende plan
        const planRef = doc(db, 'users', user.uid, 'plans', existingPlan.id)
        await updateDoc(planRef, {
          ...planData,
          weekStart: Timestamp.fromDate(weekStartDate),
          lastModified: Timestamp.now()
        })
        return existingPlan.id
      } else {
        // Opprett ny plan
        const docRef = await addDoc(
          collection(db, 'users', user.uid, 'plans'),
          {
            ...planData,
            weekStart: Timestamp.fromDate(weekStartDate),
            generatedAt: Timestamp.now(),
            lastModified: Timestamp.now()
          }
        )
        return docRef.id
      }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user, plans])

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
    loading,
    error,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    savePlan,
    updatePlan,
    updatePlanSession,
    addPlanSession,
    deletePlanSession,
    getStats
  }

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  )
}
