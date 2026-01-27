/**
 * Workout Scan Service
 * Wrapper around OCR service for scanning workout images in the planner
 * Supports multi-image scanning with automatic merging
 */

import { extractWorkoutData, mapWorkoutType } from './ocrService'

/**
 * Scan workout from one or more images and extract session data for planner
 * @param {Array<File>} images - Array of image files to scan
 * @returns {Promise<Object>} Extracted session data
 */
export async function scanWorkout(images) {
  if (!images || images.length === 0) {
    throw new Error('No images provided')
  }

  try {
    console.log(`📸 Scanning ${images.length} image(s) for workout data`)

    // Use the first image for OCR (or send all if multiple)
    const result = await extractWorkoutData(images)

    console.log('🔍 OCR Result:', result)

    // Map OCR result to planner session format
    const sessionData = {
      type: mapWorkoutType(result.workoutType) || 'hyrox',
      title: result.data?.title || '',
      description: result.data?.notes || '',
      duration_minutes: result.data?.duration || 60
    }

    // If multi-image merge occurred, add merge info to description
    if (result.dataSources && result.dataSources.length > 1) {
      const mergeInfo = `\n\n📊 Data merged fra: ${result.dataSources.join(', ')}`
      sessionData.description = (sessionData.description || '') + mergeInfo
    }

    console.log('✅ Mapped to session data:', sessionData)

    return sessionData
  } catch (error) {
    console.error('Workout scan failed:', error)
    throw new Error('Kunne ikke lese treningsdata fra bildet/bildene. Prøv igjen eller fyll inn manuelt.')
  }
}
