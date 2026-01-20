import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

/**
 * Last opp bilde til Firebase Storage
 * @param {File} file - Bildefil
 * @param {string} userId - Bruker-ID
 * @param {string} workoutId - Treningsøkt-ID
 * @returns {Promise<string>} - URL til opplastet bilde
 */
export async function uploadWorkoutImage(file, userId, workoutId) {
  if (!file) throw new Error('Ingen fil valgt')
  
  // Valider filtype
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (!validTypes.includes(file.type)) {
    throw new Error('Ugyldig filtype. Bruk JPG, PNG, WebP eller HEIC.')
  }

  // Maks filstørrelse: 5MB
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Bildet er for stort. Maks 5MB.')
  }

  // Generer unik filnavn
  const timestamp = Date.now()
  const extension = file.name.split('.').pop()
  const filename = `${timestamp}.${extension}`
  
  // Referanse til storage path
  const storageRef = ref(storage, `users/${userId}/workouts/${workoutId}/${filename}`)

  try {
    // Last opp
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString()
      }
    })

    // Hent download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  } catch (error) {
    console.error('Upload error:', error)
    throw new Error('Kunne ikke laste opp bilde. Prøv igjen.')
  }
}

/**
 * Last opp flere bilder
 * @param {File[]} files - Array med bildefiler
 * @param {string} userId - Bruker-ID
 * @param {string} workoutId - Treningsøkt-ID
 * @returns {Promise<string[]>} - Array med URLs
 */
export async function uploadMultipleImages(files, userId, workoutId) {
  // Maks 3 bilder per økt
  if (files.length > 3) {
    throw new Error('Maks 3 bilder per treningsøkt')
  }

  const uploadPromises = files.map(file => 
    uploadWorkoutImage(file, userId, workoutId)
  )

  return Promise.all(uploadPromises)
}

/**
 * Slett bilde fra Storage
 * @param {string} imageUrl - Full URL til bildet
 */
export async function deleteWorkoutImage(imageUrl) {
  try {
    // Ekstraher storage path fra URL
    const storageRef = ref(storage, imageUrl)
    await deleteObject(storageRef)
  } catch (error) {
    // Ignorer feil hvis bildet allerede er slettet
    if (error.code !== 'storage/object-not-found') {
      console.error('Delete error:', error)
      throw error
    }
  }
}

/**
 * Komprimer bilde før opplasting (client-side)
 * @param {File} file - Original fil
 * @param {number} maxWidth - Maks bredde
 * @param {number} quality - JPEG kvalitet (0-1)
 * @returns {Promise<Blob>} - Komprimert bilde
 */
export async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Behold aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Kunne ikke lese bilde'))
    }
    
    reader.onerror = () => reject(new Error('Kunne ikke lese fil'))
  })
}

export default {
  uploadWorkoutImage,
  uploadMultipleImages,
  deleteWorkoutImage,
  compressImage
}
