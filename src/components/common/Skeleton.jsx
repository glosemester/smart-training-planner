export function SkeletonCard() {
  return (
    <div className="bg-background-card rounded-2xl p-4 border border-white/5 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-white/10 rounded-xl" />
        <div className="flex-1">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-5/6" />
      </div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="bg-background-secondary rounded-xl p-4 border border-white/5 animate-pulse">
      <div className="h-3 bg-white/10 rounded w-16 mb-3" />
      <div className="h-8 bg-white/10 rounded w-20 mb-2" />
      <div className="h-2 bg-white/10 rounded w-24" />
    </div>
  )
}

export function SkeletonWorkout() {
  return (
    <div className="bg-background-card rounded-2xl p-4 border border-white/5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg" />
          <div>
            <div className="h-4 bg-white/10 rounded w-32 mb-2" />
            <div className="h-3 bg-white/10 rounded w-20" />
          </div>
        </div>
        <div className="h-8 w-16 bg-white/10 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-12 bg-white/10 rounded-lg" />
        <div className="h-12 bg-white/10 rounded-lg" />
        <div className="h-12 bg-white/10 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonCalendar() {
  return (
    <div className="bg-background-secondary rounded-2xl p-4 border border-white/5 animate-pulse">
      <div className="h-6 bg-white/10 rounded w-32 mb-4" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square bg-white/10 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
