import { useState } from 'react'
import { Camera, Upload, Scan, X, AlertCircle, CheckCircle } from 'lucide-react'
import { extractWorkoutData, ocrDataToFormData } from '../../services/ocrService'

export default function WorkoutScanner({ onDataExtracted, onClose }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Vennligst velg en bildefil')
      return
    }

    setSelectedImage(file)
    setError(null)
    setResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!selectedImage) {
      setError('Velg et bilde først')
      return
    }

    setScanning(true)
    setError(null)
    setResult(null)

    try {
      const ocrResult = await extractWorkoutData(selectedImage)

      setResult(ocrResult)

      // If successful, convert to form data and pass to parent
      if (ocrResult.detected && ocrResult.data) {
        const formData = ocrDataToFormData(ocrResult)

        // Give user a moment to see the success message
        setTimeout(() => {
          onDataExtracted(formData, ocrResult)
        }, 1500)
      }
    } catch (err) {
      setError(err.message || 'Kunne ikke skanne bildet')
      console.error('Scanning error:', err)
    } finally {
      setScanning(false)
    }
  }

  const handleClear = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setError(null)
    setResult(null)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background-primary rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">
              Skann treningsdata
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              Ta bilde av treningsapp eller whiteboard fra CrossFit/Hyrox
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-text-muted"
            aria-label="Lukk"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Image preview */}
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Valgt bilde"
                className="w-full rounded-xl border border-white/10"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-2 bg-background-primary/90 rounded-lg hover:bg-white/10 text-text-muted"
                aria-label="Fjern bilde"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Image selection */
            <div className="space-y-3">
              {/* Camera button */}
              <label className="btn-secondary w-full py-4 cursor-pointer flex items-center justify-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Camera size={20} />
                Ta bilde
              </label>

              {/* Gallery button */}
              <label className="btn-secondary w-full py-4 cursor-pointer flex items-center justify-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Upload size={20} />
                Velg fra galleri
              </label>
            </div>
          )}

          {/* Scan button */}
          {selectedImage && !result && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="btn-primary w-full py-4"
            >
              {scanning ? (
                <>
                  <div className="spinner" />
                  Skanner data...
                </>
              ) : (
                <>
                  <Scan size={20} />
                  Skann treningsdata
                </>
              )}
            </button>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Feil ved skanning</p>
                <p className="mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Success message */}
          {result && result.detected && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-success text-sm space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Data funnet!</p>
                  <p className="mt-1 opacity-90 text-text-secondary">
                    Fyller inn skjemaet...
                  </p>
                </div>
              </div>

              {/* Show confidence and suggestions */}
              {result.suggestions && (
                <div className="pt-2 border-t border-success/20">
                  <p className="text-xs text-text-muted">
                    Sikkerhet: {result.confidence === 'high' ? 'Høy' : result.confidence === 'medium' ? 'Middels' : 'Lav'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {result.suggestions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-sm text-text-secondary">
            <p className="font-medium text-secondary mb-1">Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Sørg for at bildet er tydelig og godt opplyst</li>
              <li>• Fungerer med Garmin, Strava, Apple Watch, etc.</li>
              <li>• Whiteboards: Ta bilde av hele WOD med øvelser og reps</li>
              <li>• AI estimerer RPE automatisk for CrossFit/Hyrox</li>
              <li>• Du kan redigere dataene etter skanning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
