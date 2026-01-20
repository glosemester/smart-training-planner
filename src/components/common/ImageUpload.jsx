import { useState, useRef } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import { validateImageFile, createImagePreview } from '../../services/imageService'

export default function ImageUpload({ images = [], onImagesChange, maxImages = 5 }) {
  const [previews, setPreviews] = useState(images.map(img => img.url || img))
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    setError(null)

    // Check max images limit
    if (images.length + files.length > maxImages) {
      setError(`Maks ${maxImages} bilder tillatt`)
      return
    }

    try {
      // Validate and create previews for all files
      const newFiles = []
      const newPreviews = []

      for (const file of files) {
        validateImageFile(file)
        const preview = await createImagePreview(file)
        newFiles.push(file)
        newPreviews.push(preview)
      }

      // Add to existing images
      const updatedImages = [...images, ...newFiles]
      const updatedPreviews = [...previews, ...newPreviews]

      setPreviews(updatedPreviews)
      onImagesChange(updatedImages)
    } catch (err) {
      setError(err.message)
    }

    // Reset file input
    e.target.value = null
  }

  const handleRemoveImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index)
    const updatedPreviews = previews.filter((_, i) => i !== index)

    setPreviews(updatedPreviews)
    onImagesChange(updatedImages)
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Velg bilder"
      />

      {/* Upload buttons */}
      {images.length < maxImages && (
        <div className="flex gap-2">
          {/* Camera button (for mobile) */}
          <button
            type="button"
            onClick={() => {
              // On mobile, set capture attribute
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment')
                fileInputRef.current.click()
                // Remove capture after clicking
                setTimeout(() => {
                  fileInputRef.current?.removeAttribute('capture')
                }, 100)
              }
            }}
            className="flex-1 btn-outline py-3 text-sm"
          >
            <Camera size={18} />
            Ta bilde
          </button>

          {/* Gallery button */}
          <button
            type="button"
            onClick={openFilePicker}
            className="flex-1 btn-outline py-3 text-sm"
          >
            <Upload size={18} />
            Velg fra galleri
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      {/* Image previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden bg-background-secondary border border-white/10"
            >
              <img
                src={preview}
                alt={`Bilde ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 p-1 bg-error rounded-full text-white shadow-lg hover:bg-error-dark transition-colors"
                aria-label="Fjern bilde"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* Add more placeholder */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={openFilePicker}
              className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 text-text-muted hover:text-primary"
            >
              <ImageIcon size={20} />
              <span className="text-xs">Legg til</span>
            </button>
          )}
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-text-muted">
        {images.length === 0
          ? `Last opp bilder av økten (maks ${maxImages})`
          : `${images.length} av ${maxImages} bilder`}
      </p>
    </div>
  )
}
