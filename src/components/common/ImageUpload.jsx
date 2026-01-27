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
    <div className="space-y-4">
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
        <div className="flex gap-3">
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
            className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            <span className="font-medium text-sm">Ta bilde</span>
          </button>

          {/* Gallery button */}
          <button
            type="button"
            onClick={openFilePicker}
            className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            <span className="font-medium text-sm">Last opp</span>
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Image previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 group"
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
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-colors"
                aria-label="Fjern bilde"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add more placeholder */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={openFilePicker}
              className="aspect-square rounded-xl border-dashed border-2 border-gray-200 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary"
            >
              <ImageIcon size={20} />
            </button>
          )}
        </div>
      )}

      {/* Info text */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          {images.length === 0
            ? `${maxImages} bilder maks`
            : `${images.length} / ${maxImages} bilder`}
        </p>
      </div>
    </div>
  )
}
