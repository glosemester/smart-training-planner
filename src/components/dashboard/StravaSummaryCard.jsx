import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { connectToStrava, getRecentActivities } from '../../services/stravaService'
import { Loader2, Zap, Activity, TrendingUp, Clock, MapPin, Award } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { nb } from 'date-fns/locale'

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
        setActivities(data.slice(0, 5)) // Last 5 activities
      } catch (err) {
        console.error('Failed to fetch Strava activities:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [isConnected, user?.uid])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await connectToStrava()
    } catch (err) {
      console.error('Strava connect error:', err)
      setConnecting(false)
    }
  }

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <section>
        <h2 className="px-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">Strava</h2>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="card w-full flex items-center gap-4 hover:bg-[#FC4C02]/5 hover:border-[#FC4C02]/30 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center group-hover:bg-[#FC4C02]/20 transition-colors">
            {connecting ? (
              <Loader2 className="text-[#FC4C02] animate-spin" size={24} />
            ) : (
              <Zap className="text-[#FC4C02]" size={24} />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900 dark:text-white">
              {connecting ? 'Kobler til...' : 'Koble til Strava'}
            </p>
            <p className="text-sm text-gray-500">
              Synkroniser aktiviteter automatisk
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FC4C02] flex items-center justify-center text-white">
            <Zap size={16} />
          </div>
        </button>
      </section>
    )
  }

  // Loading activities
  if (loading) {
    return (
      <section>
        <h2 className="px-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">Strava</h2>
        <div className="card flex items-center justify-center py-8">
          <Loader2 className="text-[#FC4C02] animate-spin" size={24} />
        </div>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section>
        <h2 className="px-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">Strava</h2>
        <div className="card bg-red-50 dark:bg-red-500/10 border-red-100">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </section>
    )
  }

  // Connected - show recent activities
  if (activities.length === 0) {
    return (
      <section>
        <h2 className="px-2 text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap size={18} className="text-[#FC4C02]" />
          Strava
        </h2>
        <div className="card bg-gray-50 dark:bg-white/5">
          <p className="text-sm text-gray-500">Ingen aktiviteter funnet på Strava</p>
        </div>
      </section>
    )
  }

  // Calculate summary stats
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeekActivities = activities.filter(a => new Date(a.start_date) >= weekAgo)
  const totalDistance = thisWeekActivities.reduce((sum, a) => sum + (a.distance || 0), 0)
  const totalDuration = thisWeekActivities.reduce((sum, a) => sum + (a.duration || 0), 0)
  const totalKudos = activities.reduce((sum, a) => sum + (a.kudos || 0), 0)

  return (
    <section>
      <h2 className="px-2 text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Zap size={18} className="text-[#FC4C02]" />
        Strava
      </h2>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="card bg-[#FC4C02]/5 border-[#FC4C02]/10 py-3 text-center">
          <MapPin size={16} className="mx-auto mb-1 text-[#FC4C02]" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{totalDistance.toFixed(1)}</p>
          <p className="text-xs text-gray-500">km denne uken</p>
        </div>
        <div className="card bg-[#FC4C02]/5 border-[#FC4C02]/10 py-3 text-center">
          <Clock size={16} className="mx-auto mb-1 text-[#FC4C02]" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(totalDuration / 60)}</p>
          <p className="text-xs text-gray-500">min denne uken</p>
        </div>
        <div className="card bg-[#FC4C02]/5 border-[#FC4C02]/10 py-3 text-center">
          <Award size={16} className="mx-auto mb-1 text-[#FC4C02]" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{totalKudos}</p>
          <p className="text-xs text-gray-500">kudos</p>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="space-y-2">
        {activities.slice(0, 3).map(activity => (
          <div key={activity.id} className="card py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FC4C02]/10 flex items-center justify-center">
              <Activity size={18} className="text-[#FC4C02]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {activity.type === 'Run' ? 'Løpetur' : activity.type}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{activity.distance} km</span>
                <span>•</span>
                <span>{activity.pace} /km</span>
                <span>•</span>
                <span>{format(parseISO(activity.start_date), 'd. MMM', { locale: nb })}</span>
              </div>
            </div>
            {activity.kudos > 0 && (
              <div className="flex items-center gap-1 text-[#FC4C02]">
                <Award size={14} />
                <span className="text-sm font-medium">{activity.kudos}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
