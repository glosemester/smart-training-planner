/**
 * OCR Service for extracting workout data from images
 * Supports both single and multiple images with automatic merging
 * Uses Anthropic Claude's vision capabilities via Netlify function
 */

/**
 * Convert File or Blob to base64 string
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Extract workout data from one or multiple images using AI OCR
 * If multiple images are provided, they will be analyzed and merged automatically
 * @param {File|Blob|Array<File|Blob>} imageFiles - Single image or array of images
 * @returns {Promise<Object>} Extracted (and possibly merged) workout data
 */
export async function extractWorkoutData(imageFiles) {
  try {
    // Convert single file to array for uniform handling
    const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles]

    if (files.length === 0) {
      throw new Error('No image files provided')
    }

    // Validate all files
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB per image
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    for (const file of files) {
      if (!file) {
        throw new Error('Invalid image file')
      }

      if (file.size > MAX_SIZE) {
        throw new Error(`Bilde er for stort (${(file.size / 1024 / 1024).toFixed(1)}MB). Maks størrelse er 5MB per bilde.`)
      }

      if (!validTypes.includes(file.type)) {
        throw new Error('Ugyldig bildeformat. Bruk JPEG, PNG eller WEBP.')
      }
    }

    // Convert all files to base64
    const images = await Promise.all(
      files.map(async (file) => ({
        data: await fileToBase64(file),
        type: file.type
      }))
    )

    console.log(`🖼️ Extracting workout data from ${images.length} image(s)`)

    // Call Netlify function with images array
    const response = await fetch('/.netlify/functions/extract-workout-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ images })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error ${response.status}`)
    }

    const result = await response.json()

    // Check if data was detected
    if (!result.detected) {
      throw new Error(result.message || 'Kunne ikke finne treningsdata i bildet/bildene')
    }

    console.log('✅ Workout data extracted:', {
      detected: result.detected,
      confidence: result.confidence,
      workoutType: result.workoutType,
      images: images.length,
      merged: result.dataSources ? `from ${result.dataSources.join(', ')}` : 'single source'
    })

    return result
  } catch (error) {
    console.error('OCR extraction failed:', error)
    throw error
  }
}

/**
 * Map OCR workout type to app workout type
 */
export function mapWorkoutType(ocrType) {
  const typeMap = {
    'easy_run': 'easy_run',
    'tempo': 'tempo',
    'interval': 'interval',
    'long_run': 'long_run',
    'hyrox': 'hyrox',
    'crossfit': 'crossfit',
    'strength': 'strength',
    'recovery': 'recovery_run',
    'other': 'easy_run'
  }

  return typeMap[ocrType] || 'easy_run'
}

/**
 * Convert OCR data to form data format
 */
export function ocrDataToFormData(ocrResult) {
  const { data } = ocrResult

  return {
    type: mapWorkoutType(ocrResult.workoutType),
    title: data.title || '',
    date: data.date || new Date().toISOString().split('T')[0],
    duration: data.duration || '',
    rpe: data.rpe || 5,
    notes: data.notes || '',
    running: {
      distance: data.distance || '',
      avgPace: data.avgPace || '',
      avgHR: data.avgHR || '',
      maxHR: data.maxHR || '',
      elevation: data.elevation || '',
      surface: data.surface || 'road'
    }
  }
}
