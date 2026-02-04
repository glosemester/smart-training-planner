import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getGamificationData, calculateLevel } from '../services/gamificationService'

const GamificationContext = createContext()

export function GamificationProvider({ children }) {
  const { user } = useAuth()
  const [gamificationData, setGamificationData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setGamificationData(null)
      setLoading(false)
      return
    }

    loadGamificationData()
  }, [user])

  const loadGamificationData = async () => {
    try {
      setLoading(true)
      const data = await getGamificationData(user.uid)
      setGamificationData(data)
    } catch (error) {
      console.error('Error loading gamification data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    if (user) {
      await loadGamificationData()
    }
  }

  // Calculate level info from XP
  const levelInfo = gamificationData ? calculateLevel(gamificationData.xp) : null

  const value = {
    gamificationData,
    levelInfo,
    loading,
    refresh
  }

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  )
}

export const useGamification = () => {
  const context = useContext(GamificationContext)
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider')
  }
  return context
}
