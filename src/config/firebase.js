import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyDwwiVT-WYDrggqs1GDjbEIoG-b5i7MYVw",
  authDomain: "smart-training-app-8bed1.firebaseapp.com",
  projectId: "smart-training-app-8bed1",
  storageBucket: "smart-training-app-8bed1.firebasestorage.app",
  messagingSenderId: "94725606659",
  appId: "1:94725606659:web:7e6120c361a594f687ad36"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)


// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app) // Default region us-central1

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export default app
