import { createContext, useState, useEffect } from 'react'
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../config/firebase'

export const AuthContext = createContext(null)

// E-posten som har tilgang til appen
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Lytt til auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sjekk om brukeren er autorisert
        if (firebaseUser.email !== ALLOWED_EMAIL) {
          await firebaseSignOut(auth)
          setUser(null)
          setUserProfile(null)
          setError('Ikke autorisert. Kun én bruker har tilgang til denne appen.')
        } else {
          setUser(firebaseUser)
          setError(null)
          
          // Hent eller opprett brukerprofil
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data())
          } else {
            // Opprett ny brukerprofil
            const newProfile = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              createdAt: new Date().toISOString(),
              settings: {
                weekStartsOn: 'monday',
                units: 'metric',
                defaultActivityType: 'running'
              },
              goals: {
                primary: '',
                secondary: [],
                weeklyTargets: {
                  runningKm: 0,
                  strengthSessions: 0
                }
              }
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile)
            setUserProfile(newProfile)
          }
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Sign in med Google
  const signIn = async () => {
    try {
      setError(null)
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      
      // Sjekk om e-post er tillatt
      if (result.user.email !== ALLOWED_EMAIL) {
        await firebaseSignOut(auth)
        throw new Error('Ikke autorisert. Kun én bruker har tilgang til denne appen.')
      }
      
      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setUserProfile(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Oppdater brukerprofil
  const updateProfile = async (updates) => {
    if (!user) return
    
    try {
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, updates, { merge: true })
      setUserProfile(prev => ({ ...prev, ...updates }))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
