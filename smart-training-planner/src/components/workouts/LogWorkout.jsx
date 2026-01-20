import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkouts } from '../../hooks/useWorkouts'
import { WORKOUT_TYPES, RPE_SCALE, RUNNING_SURFACES } from '../../data/workoutTypes'
import { ArrowLeft, Save, Camera, X } from 'lucide-react'

export default function LogWorkout() {
  const navigate = useNavigate()
  const { addWorkout } = useWorkouts()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'easy_run',
    title: '',
    duration: '',
    rpe: 5,
    notes: '',
    // Løping
    running: {
      distance: '',
      avgPace: '',
      avgHR: '',
      maxHR: '',
      elevation: '',
      surface: 'road'
    },
    // Styrke
    strength: {
      exercises: []
    }
  })

  const selectedType = WORKOUT_TYPES[formData.type]
  const isRunning = selectedType?.category === 'running'

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRunningChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      running: { ...prev.running, [field]: value }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const workoutData = {
        ...formData,
        title: formData.title || selectedType.name,
        duration: parseInt(formData.duration) || 0,
        rpe: parseInt(formData.rpe),
        running: isRunning ? {
          distance: parseFloat(formData.running.distance) || 0,
          avgPace: formData.running.avgPace,
          avgHR: parseInt(formData.running.avgHR) || null,
          maxHR: parseInt(formData.running.maxHR) || null,
          elevation: parseInt(formData.running.elevation) || 0,
          surface: formData.running.surface
        } : null,
        source: 'manual'
      }

      await addWorkout(workoutData)
      navigate('/workouts')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Logg treningsøkt
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dato og type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Dato</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="input-label">Type</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="input"
            >
              {Object.values(WORKOUT_TYPES).map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tittel */}
        <div>
          <label className="input-label">Tittel (valgfritt)</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={selectedType?.name || 'F.eks. Morgenløp'}
            className="input"
          />
        </div>

        {/* Varighet */}
        <div>
          <label className="input-label">Varighet (minutter)</label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => handleChange('duration', e.target.value)}
            placeholder="45"
            className="input"
            required
          />
        </div>

        {/* Løping-spesifikke felt */}
        {isRunning && (
          <div className="space-y-4 p-4 bg-running/10 rounded-xl">
            <h3 className="font-medium text-running">Løpedetaljer</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Distanse (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.running.distance}
                  onChange={(e) => handleRunningChange('distance', e.target.value)}
                  placeholder="10.5"
                  className="input"
                />
              </div>
              <div>
                <label className="input-label">Snittempo</label>
                <input
                  type="text"
                  value={formData.running.avgPace}
                  onChange={(e) => handleRunningChange('avgPace', e.target.value)}
                  placeholder="5:30"
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Snitt-puls</label>
                <input
                  type="number"
                  value={formData.running.avgHR}
                  onChange={(e) => handleRunningChange('avgHR', e.target.value)}
                  placeholder="145"
                  className="input"
                />
              </div>
              <div>
                <label className="input-label">Maks puls</label>
                <input
                  type="number"
                  value={formData.running.maxHR}
                  onChange={(e) => handleRunningChange('maxHR', e.target.value)}
                  placeholder="175"
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Høydemeter</label>
                <input
                  type="number"
                  value={formData.running.elevation}
                  onChange={(e) => handleRunningChange('elevation', e.target.value)}
                  placeholder="150"
                  className="input"
                />
              </div>
              <div>
                <label className="input-label">Underlag</label>
                <select
                  value={formData.running.surface}
                  onChange={(e) => handleRunningChange('surface', e.target.value)}
                  className="input"
                >
                  {RUNNING_SURFACES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* RPE */}
        <div>
          <label className="input-label">
            Opplevd anstrengelse (RPE): {formData.rpe}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.rpe}
            onChange={(e) => handleChange('rpe', e.target.value)}
            className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Lett</span>
            <span>Moderat</span>
            <span>Maks</span>
          </div>
        </div>

        {/* Notater */}
        <div>
          <label className="input-label">Notater</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Hvordan føltes økten?"
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-4"
        >
          {saving ? (
            <div className="spinner" />
          ) : (
            <>
              <Save size={20} />
              Lagre økt
            </>
          )}
        </button>
      </form>
    </div>
  )
}
