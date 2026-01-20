import { useContext } from 'react'
import { TrainingContext } from '../contexts/TrainingContext'

export function useWorkouts() {
  const context = useContext(TrainingContext)
  
  if (!context) {
    throw new Error('useWorkouts must be used within a TrainingProvider')
  }
  
  return context
}

export default useWorkouts
