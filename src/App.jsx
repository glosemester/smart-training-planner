import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './components/auth/LoginScreen'
import UpdatePrompt from './components/common/UpdatePrompt'

// Lazy load components for code splitting
const Layout = lazy(() => import('./components/layout/Layout'))
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const WorkoutList = lazy(() => import('./components/workouts/WorkoutList'))
const LogWorkout = lazy(() => import('./components/workouts/LogWorkout'))
const WorkoutDetail = lazy(() => import('./components/workouts/WorkoutDetail'))
const AIPlanner = lazy(() => import('./components/planning/AIPlanner'))
const GoalSetting = lazy(() => import('./components/planning/GoalSetting'))
const Statistics = lazy(() => import('./components/stats/Statistics'))
const TrainingCalendar = lazy(() => import('./components/calendar/TrainingCalendar'))
const HealthSync = lazy(() => import('./components/health/HealthSync'))
const AIChat = lazy(() => import('./components/chat/AIChat'))
const NutritionTracker = lazy(() => import('./components/nutrition/NutritionTracker'))
const StravaCallback = lazy(() => import('./components/auth/StravaCallback'))

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center">
      <div className="spinner" />
    </div>
  )
}

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
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/strava-callback" element={<StravaCallback />} />

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
            <Route path="calendar" element={<TrainingCalendar />} />
            <Route path="goals" element={<GoalSetting />} />
            <Route path="stats" element={<Statistics />} />
            <Route path="health" element={<HealthSync />} />
            <Route path="chat" element={<AIChat />} />
            <Route path="nutrition" element={<NutritionTracker />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a2e',
            color: '#f8f9fa',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#06d6a0',
              secondary: '#1a1a2e',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef476f',
              secondary: '#1a1a2e',
            },
          },
        }}
      />

      {/* PWA Update Prompt */}
      <UpdatePrompt />
    </>
  )
}

export default App
