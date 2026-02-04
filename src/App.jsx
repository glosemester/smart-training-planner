import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './components/auth/LoginScreen'
import UpdatePrompt from './components/common/UpdatePrompt'
import PageTransition from './components/layout/PageTransition'

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
// const NutritionTracker = lazy(() => import('./components/nutrition/NutritionTracker')) // Removing Pro feature
const StravaCallback = lazy(() => import('./components/auth/StravaCallback'))
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'))
const RunningCalculator = lazy(() => import('./pages/RunningCalculator'))
const NutritionPlanner = lazy(() => import('./pages/NutritionPlanner'))
const BadgesPage = lazy(() => import('./pages/BadgesPage'))

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
  const location = useLocation()

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route path="/login" element={<PageTransition><LoginScreen /></PageTransition>} />
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
              <Route index element={<PageTransition className="h-full"><Dashboard /></PageTransition>} />
              <Route path="workouts" element={<PageTransition className="h-full"><WorkoutList /></PageTransition>} />
              <Route path="workouts/new" element={<PageTransition className="h-full"><LogWorkout /></PageTransition>} />
              <Route path="workouts/:id" element={<PageTransition className="h-full"><WorkoutDetail /></PageTransition>} />
              <Route path="plan" element={<PageTransition className="h-full"><AIPlanner /></PageTransition>} />
              <Route path="calendar" element={<PageTransition className="h-full"><TrainingCalendar /></PageTransition>} />
              <Route path="goals" element={<PageTransition className="h-full"><GoalSetting /></PageTransition>} />
              <Route path="stats" element={<PageTransition className="h-full"><Statistics /></PageTransition>} />
              <Route path="health" element={<PageTransition className="h-full"><HealthSync /></PageTransition>} />
              <Route path="chat" element={<PageTransition className="h-full"><AIChat /></PageTransition>} />
              <Route path="calculator" element={<PageTransition className="h-full"><RunningCalculator /></PageTransition>} />
              <Route path="nutrition" element={<PageTransition className="h-full"><NutritionPlanner /></PageTransition>} />
              <Route path="badges" element={<PageTransition className="h-full"><BadgesPage /></PageTransition>} />
              <Route path="integrations" element={<PageTransition className="h-full"><IntegrationsPage /></PageTransition>} />
            </Route>

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
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
