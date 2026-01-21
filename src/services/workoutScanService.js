/**
 * Workout Scan Service
 * Wrapper around OCR service for scanning workout images in the planner
 */

import { extractWorkoutData, mapWorkoutType } from './ocrService'

/**
 * Scan workout from images and extract session data for planner
 * @param {Array<File>} images - Array of image files to scan
 * @returns {Promise<Object>} Extracted session data
 */
export async function scanWorkout(images) {
  if (!images || images.length === 0) {
    throw new Error('No images provided')
  }

  try {
    // Use the first image for OCR
    const result = await extractWorkoutData(images[0])

    // Map OCR result to planner session format
    const sessionData = {
      type: mapWorkoutType(result.workoutType) || 'hyrox',
      title: result.data?.title || '',
      description: result.data?.notes || '',
      duration_minutes: result.data?.duration || 60
    }

    return sessionData
  } catch (error) {
    console.error('Workout scan failed:', error)
    throw new Error('Kunne ikke lese treningsdata fra bildet. Prøv igjen eller fyll inn manuelt.')
  }
}
