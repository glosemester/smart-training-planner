import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginScreen from './components/auth/LoginScreen'
import Dashboard from './components/dashboard/Dashboard'
import WorkoutList from './components/workouts/WorkoutList'
import LogWorkout from './components/workouts/LogWorkout'
import WorkoutDetail from './components/workouts/WorkoutDetail'
import AIPlanner from './components/planning/AIPlanner'
import GoalSetting from './components/planning/GoalSetting'
import Statistics from './components/stats/Statistics'
import HealthSync from './components/health/HealthSync'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginScreen />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="workouts" element={<WorkoutList />} />
        <Route path="workouts/new" element={<LogWorkout />} />
        <Route path="workouts/:id" element={<WorkoutDetail />} />
        <Route path="plan" element={<AIPlanner />} />
        <Route path="goals" element={<GoalSetting />} />
        <Route path="stats" element={<Statistics />} />
        <Route path="health" element={<HealthSync />} />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
