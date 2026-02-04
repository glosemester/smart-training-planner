import { motion } from 'framer-motion'
import { shimmer } from '../../utils/animations'

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <motion.div
        className="h-6 w-1/3 bg-white/10 rounded"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
      <motion.div
        className="h-20 w-full bg-white/10 rounded"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
      <motion.div
        className="h-4 w-2/3 bg-white/10 rounded"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-xl">
      <motion.div
        className="h-6 w-6 bg-white/10 rounded mb-2"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
      <motion.div
        className="h-8 w-16 bg-white/10 rounded mb-1"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
      <motion.div
        className="h-3 w-20 bg-white/10 rounded"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
    </div>
  )
}

export function ActivityListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <motion.div
            className="h-12 w-12 bg-white/10 rounded-full"
            animate={shimmer.animate}
            transition={shimmer.transition}
          />
          <div className="flex-1 space-y-2">
            <motion.div
              className="h-4 w-3/4 bg-white/10 rounded"
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
            <motion.div
              className="h-3 w-1/2 bg-white/10 rounded"
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DailySummarySkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          className="h-10 w-10 bg-white/10 rounded-full"
          animate={shimmer.animate}
          transition={shimmer.transition}
        />
        <div className="flex-1 space-y-2">
          <motion.div
            className="h-5 w-2/3 bg-white/10 rounded"
            animate={shimmer.animate}
            transition={shimmer.transition}
          />
          <motion.div
            className="h-4 w-1/2 bg-white/10 rounded"
            animate={shimmer.animate}
            transition={shimmer.transition}
          />
        </div>
      </div>
      <motion.div
        className="h-32 w-full bg-white/10 rounded-lg"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
    </div>
  )
}

export function WeeklyProgressSkeleton() {
  return (
    <div className="space-y-4">
      <motion.div
        className="h-6 w-32 bg-white/10 rounded"
        animate={shimmer.animate}
        transition={shimmer.transition}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ring skeleton */}
        <div className="glass-card p-6 flex items-center justify-center">
          <motion.div
            className="h-40 w-40 bg-white/10 rounded-full"
            animate={shimmer.animate}
            transition={shimmer.transition}
          />
        </div>
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Skeleton({ type = 'card', count = 1 }) {
  const skeletonComponents = {
    card: CardSkeleton,
    metric: MetricCardSkeleton,
    activity: ActivityListSkeleton,
    daily: DailySummarySkeleton,
    weekly: WeeklyProgressSkeleton
  }

  const SkeletonComponent = skeletonComponents[type] || CardSkeleton

  if (count === 1) {
    return <SkeletonComponent />
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  )
}
