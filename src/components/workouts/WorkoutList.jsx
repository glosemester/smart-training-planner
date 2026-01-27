import { Link } from 'react-router-dom'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Plus, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { SkeletonWorkout } from '../common/Skeleton'

export default function WorkoutList() {
  const { workouts, loading } = useWorkouts()

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
          <div className="h-10 w-24 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <SkeletonWorkout key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Treningsøkter
        </h1>
        <Link to="/workouts/new" className="btn-primary hover:scale-105 transition-transform">
          <Plus size={20} />
          Ny økt
        </Link>
      </div>

      {workouts.length > 0 ? (
        <div className="space-y-2">
          {workouts.map((workout, index) => {
            const type = getWorkoutType(workout.type)
            const date = new Date(workout.date)
            
            return (
              <Link
                key={workout.id}
                to={`/workouts/${workout.id}`}
                className="card flex items-center gap-3 hover:bg-white/5 hover:scale-[1.02] transition-all duration-300 hover:shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${type.color}20` }}
                >
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {workout.title || type.name}
                  </p>
                  <p className="text-sm text-text-muted">
                    {format(date, 'EEEE d. MMMM', { locale: nb })}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    {workout.duration && <span>{workout.duration} min</span>}
                    {workout.running?.distance && <span>{workout.running.distance} km</span>}
                    {workout.rpe && <span>RPE {workout.rpe}</span>}
                    {workout.images && workout.images.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon size={12} />
                        {workout.images.length}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="text-text-muted" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-text-muted mb-4">Ingen treningsøkter registrert</p>
          <Link to="/workouts/new" className="btn-primary inline-flex">
            <Plus size={20} />
            Logg din første økt
          </Link>
        </div>
      )}
    </div>
  )
}
