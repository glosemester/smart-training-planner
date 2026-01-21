import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { WORKOUT_TYPES, RPE_SCALE, RUNNING_SURFACES } from '../../data/workoutTypes'
import { uploadWorkoutImage } from '../../services/imageService'
import { ArrowLeft, Save, Scan } from 'lucide-react'
import ImageUpload from '../common/ImageUpload'
import WorkoutScanner from '../common/WorkoutScanner'

export default function LogWorkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addWorkout, updateWorkout } = useWorkouts()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [images, setImages] = useState([])
  const [showScanner, setShowScanner] = useState(false)

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

  const handleScanComplete = (scannedData, ocrResult) => {
    // Merge scanned data with current form data
    setFormData(prev => ({
      ...prev,
      ...scannedData,
      running: {
        ...prev.running,
        ...scannedData.running
      }
    }))

    // Add OCR suggestions to notes if any
    if (ocrResult.suggestions && !formData.notes) {
      setFormData(prev => ({
        ...prev,
        notes: `[AI-skannet]\n${ocrResult.suggestions}`
      }))
    }

    // Close scanner
    setShowScanner(false)

    // Show success message
    setError(null)
  }

  const validateForm = () => {
    // Validate duration
    const duration = parseInt(formData.duration)
    if (!duration || duration <= 0) {
      throw new Error('Varighet må være større enn 0 minutter')
    }
    if (duration > 1440) { // 24 hours
      throw new Error('Varighet kan ikke være mer enn 24 timer (1440 minutter)')
    }

    // Validate running-specific fields
    if (isRunning) {
      const distance = parseFloat(formData.running.distance)
      if (distance && distance < 0) {
        throw new Error('Distanse kan ikke være negativ')
      }
      if (distance && distance > 500) {
        throw new Error('Distanse kan ikke være mer enn 500 km')
      }

      const avgHR = parseInt(formData.running.avgHR)
      const maxHR = parseInt(formData.running.maxHR)

      if (avgHR && (avgHR < 30 || avgHR > 250)) {
        throw new Error('Snitt-puls må være mellom 30 og 250 bpm')
      }

      if (maxHR && (maxHR < 30 || maxHR > 250)) {
        throw new Error('Maks-puls må være mellom 30 og 250 bpm')
      }

      if (avgHR && maxHR && maxHR < avgHR) {
        throw new Error('Maks-puls kan ikke være lavere enn snitt-puls')
      }

      const elevation = parseInt(formData.running.elevation)
      if (elevation && elevation < 0) {
        throw new Error('Høydemeter kan ikke være negativ')
      }
      if (elevation && elevation > 10000) {
        throw new Error('Høydemeter kan ikke være mer enn 10000 meter')
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Validate form data
      validateForm()

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

      // Save workout first
      const workoutId = await addWorkout(workoutData)

      // Upload images if any
      if (images.length > 0 && user) {
        const imageUrls = []

        for (const imageFile of images) {
          // Skip if already a URL (shouldn't happen but just in case)
          if (typeof imageFile === 'string') {
            imageUrls.push(imageFile)
            continue
          }

          try {
            const imageData = await uploadWorkoutImage(user.uid, workoutId, imageFile)
            imageUrls.push(imageData.url)
          } catch (imgError) {
            console.error('Failed to upload image:', imgError)
            // Continue with other images even if one fails
          }
        }

        // Update workout with image URLs if any were uploaded
        if (imageUrls.length > 0) {
          await updateWorkout(workoutId, { images: imageUrls })
        }
      }

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
      <div className="flex items-center justify-between gap-3">
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
        <button
          onClick={() => setShowScanner(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
          type="button"
        >
          <Scan size={18} />
          Skann
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Logg treningsøkt">
        {/* Dato og type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="workout-date" className="input-label">Dato</label>
            <input
              id="workout-date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="input"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="workout-type" className="input-label">Type</label>
            <select
              id="workout-type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="input"
              aria-label="Velg type treningsøkt"
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
          <label htmlFor="workout-title" className="input-label">Tittel (valgfritt)</label>
          <input
            id="workout-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={selectedType?.name || 'F.eks. Morgenløp'}
            className="input"
          />
        </div>

        {/* Varighet */}
        <div>
          <label htmlFor="workout-duration" className="input-label">Varighet (minutter)</label>
          <input
            id="workout-duration"
            type="number"
            value={formData.duration}
            onChange={(e) => handleChange('duration', e.target.value)}
            placeholder="45"
            className="input"
            required
            aria-required="true"
          />
        </div>

        {/* Løping-spesifikke felt */}
        {isRunning && (
          <div className="space-y-4 p-4 bg-running/10 rounded-xl">
            <h3 className="font-medium text-running">Løpedetaljer</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="running-distance" className="input-label">Distanse (km)</label>
                <input
                  id="running-distance"
                  type="number"
                  step="0.1"
                  value={formData.running.distance}
                  onChange={(e) => handleRunningChange('distance', e.target.value)}
                  placeholder="10.5"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="running-pace" className="input-label">Snittempo</label>
                <input
                  id="running-pace"
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
                <label htmlFor="running-avg-hr" className="input-label">Snitt-puls</label>
                <input
                  id="running-avg-hr"
                  type="number"
                  value={formData.running.avgHR}
                  onChange={(e) => handleRunningChange('avgHR', e.target.value)}
                  placeholder="145"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="running-max-hr" className="input-label">Maks puls</label>
                <input
                  id="running-max-hr"
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
                <label htmlFor="running-elevation" className="input-label">Høydemeter</label>
                <input
                  id="running-elevation"
                  type="number"
                  value={formData.running.elevation}
                  onChange={(e) => handleRunningChange('elevation', e.target.value)}
                  placeholder="150"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="running-surface" className="input-label">Underlag</label>
                <select
                  id="running-surface"
                  value={formData.running.surface}
                  onChange={(e) => handleRunningChange('surface', e.target.value)}
                  className="input"
                  aria-label="Velg underlag"
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
          <label htmlFor="workout-rpe" className="input-label">
            Opplevd anstrengelse (RPE): {formData.rpe}
          </label>
          <input
            id="workout-rpe"
            type="range"
            min="1"
            max="10"
            value={formData.rpe}
            onChange={(e) => handleChange('rpe', e.target.value)}
            className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label={`Opplevd anstrengelse: ${formData.rpe} av 10`}
            aria-valuemin="1"
            aria-valuemax="10"
            aria-valuenow={formData.rpe}
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Lett</span>
            <span>Moderat</span>
            <span>Maks</span>
          </div>
        </div>

        {/* Notater */}
        <div>
          <label htmlFor="workout-notes" className="input-label">Notater</label>
          <textarea
            id="workout-notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Hvordan føltes økten?"
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Images */}
        <div>
          <label className="input-label">Bilder</label>
          <ImageUpload
            images={images}
            onImagesChange={setImages}
            maxImages={5}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-4"
          aria-label={saving ? 'Lagrer treningsøkt' : 'Lagre treningsøkt'}
        >
          {saving ? (
            <div className="spinner" aria-hidden="true" />
          ) : (
            <>
              <Save size={20} />
              Lagre økt
            </>
          )}
        </button>
      </form>

      {/* Workout Scanner Modal */}
      {showScanner && (
        <WorkoutScanner
          onDataExtracted={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
