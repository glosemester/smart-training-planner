import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { connectToStrava, getRecentActivities } from '../../services/stravaService'
import { Link } from 'react-router-dom'
import {
  Loader2, Zap, Activity, TrendingUp, Clock, MapPin, Award,
  Heart, Mountain, Flame, ChevronRight, Footprints, Timer
} from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns'
import { nb } from 'date-fns/locale'
import GlassCard from '../ui/GlassCard'

export default function StravaSummaryCard() {
  const { userProfile, user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const isConnected = userProfile?.stravaTokens?.access_token

  // Fetch activities when connected
  useEffect(() => {
    if (!isConnected || !user) return

    const fetchActivities = async () => {
      setLoading(true)
      try {
        const data = await getRecentActivities(user.uid)
        setActivities(data)
      } catch (err) {
        console.error('Failed to fetch Strava activities:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [isConnected, user?.uid])

  // Calculate detailed stats
  const stats = useMemo(() => {
    if (activities.length === 0) return null

    const now = new Date()
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

    // Filter running activities
    const runningActivities = activities.filter(a => a.type === 'Run')

    // This week's activities
    const thisWeekRuns = runningActivities.filter(a =>
      isWithinInterval(parseISO(a.start_date), { start: thisWeekStart, end: thisWeekEnd })
    )

    // Last week's activities (for comparison)
    const lastWeekRuns = runningActivities.filter(a =>
      isWithinInterval(parseISO(a.start_date), { start: lastWeekStart, end: lastWeekEnd })
    )

    // This week stats
    const thisWeekDistance = thisWeekRuns.reduce((sum, a) => sum + (a.distance || 0), 0)
    const thisWeekDuration = thisWeekRuns.reduce((sum, a) => sum + (a.duration || 0), 0)
    const thisWeekElevation = thisWeekRuns.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0)
    const thisWeekCalories = thisWeekRuns.reduce((sum, a) => sum + (a.calories || 0), 0)

    // Last week stats
    const lastWeekDistance = lastWeekRuns.reduce((sum, a) => sum + (a.distance || 0), 0)
    const lastWeekDuration = lastWeekRuns.reduce((sum, a) => sum + (a.duration || 0), 0)

    // Average pace this week (weighted by distance)
    let avgPaceThisWeek = null
    if (thisWeekDistance > 0) {
      const totalMovingTime = thisWeekRuns.reduce((sum, a) => sum + (a.moving_time || 0), 0)
      const paceMinPerKm = totalMovingTime / 60 / thisWeekDistance
      const min = Math.floor(paceMinPerKm)
      const sec = Math.round((paceMinPerKm - min) * 60)
      avgPaceThisWeek = `${min}:${sec < 10 ? '0' : ''}${sec}`
    }

    // Average heart rate (from activities that have HR data)
    const activitiesWithHR = thisWeekRuns.filter(a => a.average_heartrate)
    const avgHR = activitiesWithHR.length > 0
      ? Math.round(activitiesWithHR.reduce((sum, a) => sum + a.average_heartrate, 0) / activitiesWithHR.length)
      : null

    // Total kudos and achievements
    const totalKudos = activities.slice(0, 10).reduce((sum, a) => sum + (a.kudos || 0), 0)
    const totalPRs = activities.slice(0, 10).reduce((sum, a) => sum + (a.pr_count || 0), 0)

    // Distance change percentage
    const distanceChange = lastWeekDistance > 0
      ? Math.round(((thisWeekDistance - lastWeekDistance) / lastWeekDistance) * 100)
      : null

    return {
      thisWeek: {
        distance: thisWeekDistance,
        duration: thisWeekDuration,
        elevation: thisWeekElevation,
        calories: thisWeekCalories,
        runs: thisWeekRuns.length,
        avgPace: avgPaceThisWeek,
        avgHR
      },
      lastWeek: {
        distance: lastWeekDistance,
        duration: lastWeekDuration
      },
      distanceChange,
      totalKudos,
      totalPRs,
      allTimeRuns: runningActivities.length,
      allTimeDistance: runningActivities.reduce((sum, a) => sum + (a.distance || 0), 0)
    }
  }, [activities])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await connectToStrava()
    } catch (err) {
      console.error('Strava connect error:', err)
      setConnecting(false)
    }
  }

  // Activity type icon mapping
  const getActivityIcon = (type) => {
    switch (type) {
      case 'Run': return '🏃'
      case 'Ride': return '🚴'
      case 'Swim': return '🏊'
      case 'Walk': return '🚶'
      case 'Hike': return '🥾'
      case 'WeightTraining': return '🏋️'
      default: return '💪'
    }
  }

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <section>
        <h2 className="px-1 text-lg font-semibold text-text-primary mb-3">Strava</h2>
        <GlassCard
          className="flex items-center gap-4 cursor-pointer hover:border-[#FC4C02]/30 transition-colors group"
          onClick={handleConnect}
        >
          <div className="w-12 h-12 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center group-hover:bg-[#FC4C02]/20 transition-colors">
            {connecting ? (
              <Loader2 className="text-[#FC4C02] animate-spin" size={24} />
            ) : (
              <Zap className="text-[#FC4C02]" size={24} />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-text-primary">
              {connecting ? 'Kobler til...' : 'Koble til Strava'}
            </p>
            <p className="text-sm text-text-secondary">
              Synkroniser aktiviteter automatisk
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FC4C02] flex items-center justify-center text-white">
            <Zap size={16} />
          </div>
        </GlassCard>
      </section>
    )
  }

  // Loading activities
  if (loading) {
    return (
      <section>
        <h2 className="px-1 text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Zap size={18} className="text-[#FC4C02]" />
          Strava
        </h2>
        <GlassCard className="flex items-center justify-center py-12">
          <Loader2 className="text-[#FC4C02] animate-spin" size={28} />
        </GlassCard>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section>
        <h2 className="px-1 text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Zap size={18} className="text-[#FC4C02]" />
          Strava
        </h2>
        <GlassCard className="bg-error/10 border-error/20">
          <p className="text-sm text-error">{error}</p>
        </GlassCard>
      </section>
    )
  }

  // No activities
  if (activities.length === 0) {
    return (
      <section>
        <h2 className="px-1 text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Zap size={18} className="text-[#FC4C02]" />
          Strava
        </h2>
        <GlassCard className="text-center py-8">
          <Activity className="mx-auto mb-3 text-text-muted" size={32} />
          <p className="text-text-secondary">Ingen aktiviteter funnet på Strava</p>
        </GlassCard>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Zap size={18} className="text-[#FC4C02]" />
          Strava
        </h2>
        <a
          href="https://www.strava.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#FC4C02] hover:text-[#e04400] font-medium uppercase tracking-wider"
        >
          Åpne Strava
        </a>
      </div>

      {/* Weekly Stats Overview */}
      {stats && (
        <GlassCard className="relative overflow-hidden border-[#FC4C02]/20">
          {/* Highlight gradient */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FC4C02] to-orange-400 opacity-80" />

          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Denne uken</span>
              {stats.distanceChange !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stats.distanceChange >= 0
                    ? 'bg-success/20 text-success'
                    : 'bg-error/20 text-error'
                }`}>
                  {stats.distanceChange >= 0 ? '+' : ''}{stats.distanceChange}% vs forrige uke
                </span>
              )}
            </div>

            {/* Main stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#FC4C02]/10 rounded-xl p-3 border border-[#FC4C02]/10">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-[#FC4C02]" />
                  <span className="text-xs text-text-muted">Distanse</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">{stats.thisWeek.distance.toFixed(1)}<span className="text-sm font-normal text-text-secondary ml-1">km</span></p>
              </div>
              <div className="bg-[#FC4C02]/10 rounded-xl p-3 border border-[#FC4C02]/10">
                <div className="flex items-center gap-2 mb-1">
                  <Timer size={14} className="text-[#FC4C02]" />
                  <span className="text-xs text-text-muted">Tid</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">
                  {stats.thisWeek.duration >= 60
                    ? `${Math.floor(stats.thisWeek.duration / 60)}t ${stats.thisWeek.duration % 60}m`
                    : `${stats.thisWeek.duration}m`
                  }
                </p>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Footprints size={14} className="mx-auto mb-1 text-text-muted" />
                <p className="text-sm font-bold text-text-primary">{stats.thisWeek.runs}</p>
                <p className="text-[10px] text-text-muted">økter</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <TrendingUp size={14} className="mx-auto mb-1 text-text-muted" />
                <p className="text-sm font-bold text-text-primary">{stats.thisWeek.avgPace || '-'}</p>
                <p className="text-[10px] text-text-muted">/km snitt</p>
              </div>
              {stats.thisWeek.avgHR && (
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <Heart size={14} className="mx-auto mb-1 text-red-400" />
                  <p className="text-sm font-bold text-text-primary">{stats.thisWeek.avgHR}</p>
                  <p className="text-[10px] text-text-muted">bpm snitt</p>
                </div>
              )}
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <Mountain size={14} className="mx-auto mb-1 text-text-muted" />
                <p className="text-sm font-bold text-text-primary">{Math.round(stats.thisWeek.elevation)}</p>
                <p className="text-[10px] text-text-muted">hm</p>
              </div>
              {stats.thisWeek.calories > 0 && !stats.thisWeek.avgHR && (
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <Flame size={14} className="mx-auto mb-1 text-orange-400" />
                  <p className="text-sm font-bold text-text-primary">{stats.thisWeek.calories}</p>
                  <p className="text-[10px] text-text-muted">kcal</p>
                </div>
              )}
            </div>
          </div>

          {/* Decorative glow */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#FC4C02]/10 rounded-full blur-3xl pointer-events-none" />
        </GlassCard>
      )}

      {/* Recent Activities */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted uppercase tracking-widest font-bold px-1">Siste aktiviteter</p>
        {activities.slice(0, 5).map(activity => (
          <a
            key={activity.id}
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <GlassCard className="py-3 flex items-center gap-3 group" hoverEffect>
              <div className="w-11 h-11 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center text-lg">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate group-hover:text-[#FC4C02] transition-colors">
                  {activity.name || (activity.type === 'Run' ? 'Løpetur' : activity.type)}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span className="font-medium">{activity.distance} km</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{activity.pace} /km</span>
                  {activity.average_heartrate && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="flex items-center gap-0.5">
                        <Heart size={10} className="text-red-400" />
                        {Math.round(activity.average_heartrate)}
                      </span>
                    </>
                  )}
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{format(parseISO(activity.start_date), 'd. MMM', { locale: nb })}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {activity.kudos > 0 && (
                  <div className="flex items-center gap-1 text-[#FC4C02]">
                    <Award size={12} />
                    <span className="text-xs font-bold">{activity.kudos}</span>
                  </div>
                )}
                {activity.pr_count > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <span className="text-[10px] font-bold">🏆 {activity.pr_count} PR</span>
                  </div>
                )}
                <ChevronRight size={16} className="text-white/20 group-hover:text-[#FC4C02] transition-colors" />
              </div>
            </GlassCard>
          </a>
        ))}
      </div>

      {/* All-time stats footer */}
      {stats && (
        <div className="flex items-center justify-center gap-4 py-2 text-xs text-text-muted">
          <span>Totalt: <span className="font-bold text-text-secondary">{stats.allTimeDistance.toFixed(0)} km</span></span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span><span className="font-bold text-text-secondary">{stats.allTimeRuns}</span> løpeturer</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span><span className="font-bold text-[#FC4C02]">{stats.totalKudos}</span> kudos</span>
        </div>
      )}
    </section>
  )
}
