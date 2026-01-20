import { useParams, useNavigate } from 'react-router-dom'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ArrowLeft, Edit, Trash2, Image as ImageIcon } from 'lucide-react'

export default function WorkoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { workouts, deleteWorkout } = useWorkouts()

  const workout = workouts.find(w => w.id === id)

  if (!workout) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Fant ikke treningsøkten</p>
        <button onClick={() => navigate('/workouts')} className="btn-primary mt-4">
          Tilbake til liste
        </button>
      </div>
    )
  }

  const type = getWorkoutType(workout.type)
  const date = new Date(workout.date)

  const handleDelete = async () => {
    if (window.confirm('Er du sikker på at du vil slette denne økten?')) {
      await deleteWorkout(id)
      navigate('/workouts')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary">
              {workout.title || type.name}
            </h1>
            <p className="text-sm text-text-muted">
              {format(date, 'EEEE d. MMMM yyyy', { locale: nb })}
            </p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg hover:bg-error/10 text-error"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Type badge */}
      <div 
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
        style={{ backgroundColor: `${type.color}20`, color: type.color }}
      >
        <span className="text-lg">{type.icon}</span>
        {type.name}
      </div>

      {/* Stats */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          {workout.duration && (
            <div>
              <p className="stat-label">Varighet</p>
              <p className="stat-value">{workout.duration} min</p>
            </div>
          )}
          {workout.running?.distance && (
            <div>
              <p className="stat-label">Distanse</p>
              <p className="stat-value">{workout.running.distance} km</p>
            </div>
          )}
          {workout.running?.avgPace && (
            <div>
              <p className="stat-label">Tempo</p>
              <p className="stat-value">{workout.running.avgPace}/km</p>
            </div>
          )}
          {workout.running?.avgHR && (
            <div>
              <p className="stat-label">Snitt-puls</p>
              <p className="stat-value">{workout.running.avgHR} bpm</p>
            </div>
          )}
          {workout.rpe && (
            <div>
              <p className="stat-label">RPE</p>
              <p className="stat-value">{workout.rpe}/10</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {workout.notes && (
        <div className="card">
          <h3 className="font-medium text-text-primary mb-2">Notater</h3>
          <p className="text-text-secondary whitespace-pre-wrap">{workout.notes}</p>
        </div>
      )}

      {/* Images */}
      {workout.images && workout.images.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={18} className="text-text-secondary" />
            <h3 className="font-medium text-text-primary">Bilder</h3>
            <span className="text-xs text-text-muted">({workout.images.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {workout.images.map((imageUrl, index) => (
              <a
                key={index}
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-xl overflow-hidden bg-background-secondary border border-white/10 hover:border-primary/50 transition-colors"
              >
                <img
                  src={imageUrl}
                  alt={`Treningsbilde ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
