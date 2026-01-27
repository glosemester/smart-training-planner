import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

/**
 * Compress image before upload
 */
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Canvas to Blob conversion failed'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('Image loading failed'))
    }

    reader.onerror = () => reject(new Error('File reading failed'))
  })
}

/**
 * Upload image to Firebase Storage
 */
export async function uploadWorkoutImage(userId, workoutId, file) {
  try {
    // Compress image
    const compressedBlob = await compressImage(file)

    // Create unique filename
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const storagePath = `users/${userId}/workouts/${workoutId}/${fileName}`

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath)
    const snapshot = await uploadBytes(storageRef, compressedBlob)

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)

    return {
      url: downloadURL,
      path: storagePath,
      fileName,
      uploadedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Image upload error:', error)
    throw new Error('Kunne ikke laste opp bilde. Prøv igjen.')
  }
}

/**
 * Delete image from Firebase Storage
 */
export async function deleteWorkoutImage(imagePath) {
  try {
    const storageRef = ref(storage, imagePath)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Image delete error:', error)
    // Don't throw error if image doesn't exist
    if (error.code !== 'storage/object-not-found') {
      throw new Error('Kunne ikke slette bilde')
    }
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']

  if (!file) {
    throw new Error('Ingen fil valgt')
  }

  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Ugyldig filtype. Kun JPG, PNG, WEBP og HEIC er tillatt.')
  }

  if (file.size > maxSize) {
    throw new Error('Filen er for stor. Maks 10MB.')
  }

  return true
}

/**
 * Create image thumbnail data URL (for preview)
 */
export function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      resolve(e.target.result)
    }

    reader.onerror = () => {
      reject(new Error('Kunne ikke lese bilde'))
    }

    reader.readAsDataURL(file)
  })
}

export default {
  uploadWorkoutImage,
  deleteWorkoutImage,
  validateImageFile,
  createImagePreview
}
