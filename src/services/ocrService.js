/**
 * OCR Service for extracting workout data from images
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
 * Extract workout data from an image using AI OCR
 * @param {File|Blob} imageFile - The image file to analyze
 * @returns {Promise<Object>} Extracted workout data
 */
export async function extractWorkoutData(imageFile) {
  try {
    // Validate file
    if (!imageFile) {
      throw new Error('No image file provided')
    }

    // Check file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (imageFile.size > MAX_SIZE) {
      throw new Error('Bildet er for stort. Maks størrelse er 5MB.')
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(imageFile.type)) {
      throw new Error('Ugyldig bildeformat. Bruk JPEG, PNG eller WEBP.')
    }

    // Convert to base64
    const base64Image = await fileToBase64(imageFile)

    // Call Netlify function
    const response = await fetch('/.netlify/functions/extract-workout-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData: base64Image,
        imageType: imageFile.type
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error ${response.status}`)
    }

    const result = await response.json()

    // Check if data was detected
    if (!result.detected) {
      throw new Error(result.message || 'Kunne ikke finne treningsdata i bildet')
    }

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
