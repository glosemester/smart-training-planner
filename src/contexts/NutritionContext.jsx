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
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'

export const NutritionContext = createContext(null)

export function NutritionProvider({ children }) {
  const { user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Hent måltider når bruker er innlogget
  useEffect(() => {
    if (!user) {
      setMeals([])
      setLoading(false)
      return
    }

    setLoading(true)

    // Hent måltider fra siste 30 dager
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const mealsQuery = query(
      collection(db, 'users', user.uid, 'meals'),
      where('date', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      mealsQuery,
      (snapshot) => {
        const mealData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date)
        }))
        setMeals(mealData)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching meals:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Legg til måltid
  const addMeal = useCallback(async (mealData) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const docRef = await addDoc(
        collection(db, 'users', user.uid, 'meals'),
        {
          ...mealData,
          date: Timestamp.fromDate(new Date(mealData.date)),
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

  // Oppdater måltid
  const updateMeal = useCallback(async (mealId, updates) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      const mealRef = doc(db, 'users', user.uid, 'meals', mealId)
      await updateDoc(mealRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user])

  // Slett måltid
  const deleteMeal = useCallback(async (mealId) => {
    if (!user) throw new Error('Ikke innlogget')

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'meals', mealId))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user])

  // Hent måltider for spesifikk dato
  const getMealsForDate = useCallback((date) => {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    return meals.filter(meal => {
      const mealDate = new Date(meal.date)
      mealDate.setHours(0, 0, 0, 0)
      return mealDate.getTime() === targetDate.getTime()
    })
  }, [meals])

  const value = {
    meals,
    loading,
    error,
    addMeal,
    updateMeal,
    deleteMeal,
    getMealsForDate
  }

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  )
}
