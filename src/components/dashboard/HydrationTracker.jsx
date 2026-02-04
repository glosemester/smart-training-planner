import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, Plus, Minus, Trophy, Target } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { db } from '../../config/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import GlassCard from '../ui/GlassCard'
import Button from '../ui/Button'
import { scaleIn } from '../../utils/animations'
import toast from 'react-hot-toast'

/**
 * HydrationTracker - Daily water intake tracker
 * Calculates daily goal based on body weight and training volume
 */
export default function HydrationTracker() {
  const { user, userProfile } = useAuth()
  const { workouts } = useWorkouts()

  const [waterIntake, setWaterIntake] = useState(0) // in ml
  const [isLoading, setIsLoading] = useState(true)

  // Calculate daily hydration goal
  const dailyGoal = useMemo(() => {
    // Base: 30-35ml per kg body weight (using 33ml average)
    const bodyWeight = userProfile?.bodyWeight || 70 // kg
    const baseWater = bodyWeight * 33

    // Add water for today's training
    const today = new Date().toISOString().split('T')[0]
    const todaysWorkout = workouts.find(w => w.date === today)
    const trainingWater = todaysWorkout ? (todaysWorkout.duration || 0) * 10 : 0 // 10ml per minute

    return Math.round(baseWater + trainingWater)
  }, [userProfile?.bodyWeight, workouts])

  // Load today's water intake
  useEffect(() => {
    const loadHydration = async () => {
      if (!user) return

      try {
        const today = new Date().toISOString().split('T')[0]
        const hydrationRef = doc(db, 'users', user.uid, 'hydration', today)
        const hydrationDoc = await getDoc(hydrationRef)

        if (hydrationDoc.exists()) {
          setWaterIntake(hydrationDoc.data().totalMl || 0)
        }
      } catch (error) {
        console.error('Failed to load hydration:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHydration()
  }, [user])

  // Save water intake to Firestore
  const saveWaterIntake = async (newAmount) => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const hydrationRef = doc(db, 'users', user.uid, 'hydration', today)

      await setDoc(hydrationRef, {
        date: today,
        totalMl: newAmount,
        goal: dailyGoal,
        updatedAt: new Date().toISOString()
      })

      setWaterIntake(newAmount)

      // Celebration toast when goal reached
      if (newAmount >= dailyGoal && waterIntake < dailyGoal) {
        toast.success('🎉 Daglig vannmål nådd!', {
          icon: '💧',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Failed to save hydration:', error)
      toast.error('Kunne ikke lagre vanninntak')
    }
  }

  const addWater = (amount) => {
    const newAmount = waterIntake + amount
    saveWaterIntake(newAmount)
  }

  const removeWater = (amount) => {
    const newAmount = Math.max(0, waterIntake - amount)
    saveWaterIntake(newAmount)
  }

  const resetWater = () => {
    saveWaterIntake(0)
    toast.success('Vanninntak nullstilt')
  }

  const progress = Math.min((waterIntake / dailyGoal) * 100, 100)
  const isGoalReached = waterIntake >= dailyGoal

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-32 bg-white/5 rounded" />
      </GlassCard>
    )
  }

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplet size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-text-primary">Hydrering</h3>
          </div>
          {isGoalReached && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Trophy size={20} className="text-primary fill-primary/20" />
            </motion.div>
          )}
        </div>

        {/* Progress Circle */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            {/* Background circle */}
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/10"
              />
              {/* Progress circle */}
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="url(#waterGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 70 * (1 - progress / 100)
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={waterIntake}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-text-primary"
              >
                {(waterIntake / 1000).toFixed(1)}L
              </motion.div>
              <div className="text-xs text-text-muted">
                av {(dailyGoal / 1000).toFixed(1)}L
              </div>
              <div className="text-sm font-semibold text-blue-400 mt-1">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[250, 500, 750].map(amount => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all duration-200 group"
            >
              <Droplet size={16} className="text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text-primary">{amount}ml</div>
            </button>
          ))}
        </div>

        {/* Fine Control */}
        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => removeWater(100)}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={waterIntake === 0}
          >
            <Minus size={16} />
            100ml
          </Button>

          <Button
            onClick={() => addWater(100)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Plus size={16} />
            100ml
          </Button>
        </div>

        {/* Reset button (small) */}
        {waterIntake > 0 && (
          <button
            onClick={resetWater}
            className="w-full mt-3 text-xs text-text-muted hover:text-error transition-colors"
          >
            Nullstill
          </button>
        )}

        {/* Daily tip */}
        <AnimatePresence>
          {!isGoalReached && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <Target size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary">
                  💡 Drikk jevnt utover dagen for optimal hydrering
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
