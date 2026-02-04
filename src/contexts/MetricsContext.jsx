import { createContext, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { WhoopService } from '../services/WhoopService'
import stravaService from '../services/stravaService'
import { DataHubService } from '../services/DataHubService'
import { useAuth } from '../hooks/useAuth'
import { useWorkouts } from '../hooks/useWorkouts'

const MetricsContext = createContext()

export function MetricsProvider({ children }) {
  const { user, userProfile } = useAuth()
  const { workouts } = useWorkouts()

  // Whoop metrics (cache 5 min)
  const { data: whoopData, isLoading: whoopLoading } = useQuery({
    queryKey: ['whoop', user?.uid],
    queryFn: () => WhoopService.getWeeklySummary(),
    staleTime: 5 * 60 * 1000,
    enabled: !!userProfile?.integrations?.whoop?.isConnected,
    retry: 1
  })

  // Strava metrics (cache 10 min)
  const { data: stravaData, isLoading: stravaLoading } = useQuery({
    queryKey: ['strava', user?.uid],
    queryFn: () => stravaService.getRecentActivities(user.uid),
    staleTime: 10 * 60 * 1000,
    enabled: !!user,
    retry: 1
  })

  // Weather (cache 30 min)
  const { data: weather, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather'],
    queryFn: () => DataHubService.getWeather(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  })

  // Weekly load calculation (single source of truth)
  const weeklyLoad = useMemo(() => {
    if (!workouts?.length) return null

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)

    const thisWeek = workouts.filter(w => {
      const wDate = new Date(w.date)
      return wDate >= weekStart && wDate <= now
    })

    return {
      hours: Math.round(thisWeek.reduce((sum, w) => sum + (w.duration || 0), 0) / 60 * 10) / 10,
      km: Math.round(thisWeek.reduce((sum, w) => sum + (w.running?.distance || 0), 0) * 10) / 10,
      count: thisWeek.length
    }
  }, [workouts])

  // Unified readiness score (Whoop recovery OR calculated estimate)
  const readiness = useMemo(() => {
    if (whoopData?.recovery?.records?.[0]) {
      return whoopData.recovery.records[0].score?.recovery_score
    }
    // Fallback: simple estimation based on recent load
    if (weeklyLoad) {
      // Simple heuristic: 100% - (load factor * 10)
      // If training 8+ hours/week, readiness drops
      const loadFactor = Math.min(weeklyLoad.hours / 8, 1.5)
      return Math.max(30, Math.round(100 - (loadFactor * 20)))
    }
    return 80 // Default if no data
  }, [whoopData, weeklyLoad])

  // Health metrics from Whoop or defaults
  const health = useMemo(() => {
    const recentRecoveries = whoopData?.recovery?.records || []

    // Calculate 24-hour averages for stability
    if (recentRecoveries.length > 0) {
      const recent = recentRecoveries.slice(0, 2)

      const avgHrv = recent.length > 0
        ? Math.round(recent.reduce((sum, r) => sum + (r.score?.hrv_rmssd_milli || 0), 0) / recent.length)
        : null

      const avgRhr = recent.length > 0
        ? Math.round(recent.reduce((sum, r) => sum + (r.score?.resting_heart_rate || 0), 0) / recent.length)
        : null

      const latestSleep = whoopData?.sleep?.records?.[0]
      const sleepPerformance = latestSleep?.score?.sleep_performance_percentage || null
      const sleepDuration = latestSleep?.score?.total_in_bed_time_milli
        ? Math.round(latestSleep.score.total_in_bed_time_milli / 3600000 * 10) / 10
        : null

      return {
        restingHR: avgRhr,
        hrv: avgHrv,
        sleepPerformance,
        sleepDuration
      }
    }

    // Fallback to DataHub mock data
    return DataHubService.getHealthMetrics()
  }, [whoopData])

  const value = {
    whoop: whoopData,
    strava: stravaData,
    weather,
    weeklyLoad,
    readiness,
    health,
    // Loading states
    isLoading: whoopLoading || stravaLoading || weatherLoading
  }

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  )
}

export const useMetrics = () => {
  const context = useContext(MetricsContext)
  if (!context) {
    throw new Error('useMetrics must be used within MetricsProvider')
  }
  return context
}
