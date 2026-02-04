import { useMemo, useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { format, differenceInDays } from 'date-fns'
import { nb } from 'date-fns/locale'
import { WhoopService } from '../../services/WhoopService'
import {
  Calendar,
  Clock,
  MapPin,
  Flame,
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/animations'
import { DailySummarySkeleton, WeeklyProgressSkeleton, CardSkeleton } from '../ui/Skeleton'
import Accordion from '../ui/Accordion'
import CompactMetricsCard from './CompactMetricsCard'
import WeeklyProgress from './WeeklyProgress'
import WeekCalendarStrip from './WeekCalendarStrip'
import TodaysWorkout from './TodaysWorkout'
import GamificationWidget from './GamificationWidget'
import GlassCard from '../ui/GlassCard'
import Button from '../ui/Button'
import { useMetrics } from '../../contexts/MetricsContext'

// Lazy load below-fold components for better performance
const StravaSummaryCard = lazy(() => import('./StravaSummaryCard'))
const WhoopSummaryCard = lazy(() => import('./WhoopSummaryCard'))
const VitalGoals = lazy(() => import('./VitalGoals'))

export default function Dashboard() {
  const { userProfile } = useAuth()
  const { workouts, currentPlan, loading } = useWorkouts()
  const { readiness, health, weeklyLoad, whoop } = useMetrics()
  const functions = getFunctions()

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Løper'

  // Sync Whoop metrics on mount if connected
  useEffect(() => {
    const syncWhoopData = async () => {
      if (userProfile?.integrations?.whoop?.isConnected) {
        try {
          const syncWhoopMetrics = httpsCallable(functions, 'syncWhoopMetrics')
          await syncWhoopMetrics()
          console.log('✅ Whoop data synced successfully')
        } catch (err) {
          console.error('Failed to sync Whoop data:', err)
          // Silent fail - don't block UI
        }
      }
    }

    syncWhoopData()
  }, [userProfile?.integrations?.whoop?.isConnected, functions])

  // Handle OAuth Callback (Strava or Whoop)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state'); // Whoop uses state
    const scope = params.get('scope'); // Strava uses scope

    if (code && state) {
      // Assume Whoop if state is present (Strava also has state but we only set it for Whoop currently)
      // Or check if state matches our hex pattern.
      // For now, let's try Whoop login if state is present.
      const handleWhoopCallback = async () => {
        try {
          await WhoopService.completeLogin(code, state);
          // Clear URL parameters
          window.history.replaceState({}, document.title, "/");
          // Optional: Trigger a reload or user profile update to reflect new connection
          window.location.reload();
        } catch (err) {
          console.error("Whoop Connection Failed:", err);
          alert("Failed to connect Whoop. See console.");
        }
      };
      handleWhoopCallback();
    }
  }, []);


  // Neste planlagte økt
  const nextWorkout = useMemo(() => {
    if (!currentPlan?.sessions) return null

    const today = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayIndex = today.getDay()

    for (let i = 0; i < 7; i++) {
      const checkDay = dayNames[(todayIndex + i) % 7]
      const session = currentPlan.sessions.find(s =>
        s.day === checkDay && !s.completed && s.type !== 'rest'
      )
      if (session) {
        return {
          ...session,
          isToday: i === 0,
          isTomorrow: i === 1,
          daysAway: i
        }
      }
    }
    return null
  }, [currentPlan?.id, currentPlan?.sessions?.length])

  // Calculate Streak
  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 0
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date))

    // Handle edge case if no workouts
    if (!sortedWorkouts[0]) return 0

    const lastWorkoutDate = new Date(sortedWorkouts[0].date)
    lastWorkoutDate.setHours(0, 0, 0, 0)

    if (differenceInDays(today, lastWorkoutDate) > 1) return 0

    let checkDate = new Date(today)
    if (differenceInDays(today, lastWorkoutDate) === 1) checkDate.setDate(checkDate.getDate() - 1)

    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date)
      workoutDate.setHours(0, 0, 0, 0)
      if (workoutDate.getTime() === checkDate.getTime()) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (workoutDate < checkDate) break
    }
    return streak
  }, [workouts.length])

  if (loading) {
    return (
      <div className="space-y-6 pb-24">
        {/* Header Skeleton */}
        <div className="flex items-end justify-between px-1">
          <div className="h-10 w-48 bg-white/10 rounded animate-shimmer" />
          <div className="h-8 w-16 bg-white/10 rounded-full animate-shimmer" />
        </div>

        {/* Cards Skeleton */}
        <DailySummarySkeleton />
        <CardSkeleton />
        <WeeklyProgressSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="space-y-6 pb-24"
    >
      {/* 1. Header (Minimalist) */}
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-widest">
            {format(new Date(), 'MMMM yyyy', { locale: nb })}
          </p>
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
            Hei, <span className="text-white">{firstName}</span>
          </h1>
        </div>

        {/* Streak Badge (Glass) */}
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full backdrop-blur-md">
          <Flame size={16} className="text-primary fill-primary/20" />
          <span className="font-bold text-primary text-sm">{currentStreak}</span>
        </div>
      </div>

      {/* 2. Week Calendar Strip */}
      <motion.div variants={fadeInUp}>
        <WeekCalendarStrip />
      </motion.div>

      {/* 3 & 4. Cards with Stagger Animation */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        {/* Hero: Compact Metrics (Apple Health Style) */}
        <motion.div variants={staggerItem}>
          <CompactMetricsCard
            readiness={readiness}
            health={health}
            weeklyLoad={weeklyLoad}
            whoop={whoop}
          />
        </motion.div>

        {/* Weekly Progress - Compact */}
        <motion.div variants={staggerItem}>
          <WeeklyProgress workouts={workouts} />
        </motion.div>

        {/* Gamification - Compact */}
        <motion.div variants={staggerItem}>
          <GamificationWidget />
        </motion.div>

        {/* Today's Workout (with Whoop adaptation) or Next Workout */}
        <motion.div variants={staggerItem}>
          {nextWorkout ? (
            nextWorkout.isToday ? (
              <TodaysWorkout workout={nextWorkout} />
            ) : (
              <section>
                <div className="flex items-center justify-between px-1 mb-3">
                  <h2 className="text-lg font-semibold text-text-primary">Neste økt</h2>
                  <Link to="/plan" className="text-xs text-primary hover:text-primary-light font-medium uppercase tracking-wider">
                    Åpne plan
                  </Link>
                </div>
                <Link to="/plan" className="block group">
                  <GlassCard className="relative overflow-hidden group-hover:shadow-glow-primary transition-all duration-300 border-primary/20 bg-background-surface/60">
                    {/* Highlight gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-80" />

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-text-secondary backdrop-blur-md border border-white/5">
                          {nextWorkout.isTomorrow ? 'I morgen' : format(new Date().setDate(new Date().getDate() + nextWorkout.daysAway), 'EEEE', { locale: nb })}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <ArrowRight size={18} className="text-text-muted group-hover:text-primary" />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold mb-2 text-text-primary">{nextWorkout.title}</h3>
                      <p className="text-text-secondary text-sm mb-5 line-clamp-1">{nextWorkout.description}</p>

                      <div className="flex gap-3">
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                          <Clock size={14} className="text-text-muted" />
                          <span className="font-medium text-sm text-text-primary">{nextWorkout.duration_minutes} min</span>
                        </div>
                        {nextWorkout.details?.distance_km && (
                          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                            <MapPin size={14} className="text-text-muted" />
                            <span className="font-medium text-sm text-text-primary">{nextWorkout.details.distance_km} km</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Decorative Glow */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                  </GlassCard>
                </Link>
              </section>
            )
          ) : (
            <section>
              <GlassCard className="flex flex-col items-center justify-center py-8 text-center border-dashed border-2 border-white/5 bg-transparent">
                <Calendar className="text-text-muted mb-3 opacity-50" size={32} />
                <p className="text-text-secondary font-medium mb-4">Ingen aktiv plan</p>
                <Link to="/plan">
                  <Button size="sm" variant="outline">Lag ny plan</Button>
                </Link>
              </GlassCard>
            </section>
          )}
        </motion.div>
      </motion.div>

      {/* Collapsible Sections - Integrations (Lazy Loaded) */}
      <div className="space-y-4">
        <Suspense fallback={<CardSkeleton />}>
          <Accordion
            title="Strava Aktiviteter"
            icon={Activity}
            defaultOpen={false}
          >
            <div className="pt-4">
              <StravaSummaryCard />
            </div>
          </Accordion>
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <Accordion
            title="Whoop Recovery"
            icon={Activity}
            defaultOpen={false}
          >
            <div className="pt-4">
              <WhoopSummaryCard />
            </div>
          </Accordion>
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <VitalGoals />
        </Suspense>
      </div>
    </motion.div>
  )
}
