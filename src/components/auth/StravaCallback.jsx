import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { handleStravaCallback } from '../../services/stravaService'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function StravaCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('processing') // processing, success, error
  const [error, setError] = useState(null)
  const hasProcessed = useRef(false)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Prevent double processing
    if (hasProcessed.current) {
      return
    }

    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      hasProcessed.current = true
      setStatus('error')
      setError('Du avbrøt Strava-tilkoblingen')
      setTimeout(() => navigate('/'), 3000)
      return
    }

    if (!code) {
      hasProcessed.current = true
      setStatus('error')
      setError('Ingen autorisasjonskode mottatt fra Strava')
      setTimeout(() => navigate('/'), 3000)
      return
    }

    if (!user) {
      hasProcessed.current = true
      setStatus('error')
      setError('Du må være innlogget for å koble til Strava')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    // Exchange code for token
    hasProcessed.current = true
    const exchangeToken = async () => {
      try {
        await handleStravaCallback(code, user.uid)
        setStatus('success')
        setTimeout(() => navigate('/'), 2000)
      } catch (err) {
        console.error('Strava callback error:', err)
        setStatus('error')
        setError(err.message || 'Kunne ikke koble til Strava')
        setTimeout(() => navigate('/'), 3000)
      }
    }

    exchangeToken()
  }, [searchParams, user, authLoading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-[#FC4C02] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Kobler til Strava...
            </h2>
            <p className="text-gray-500">Vennligst vent</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Strava tilkoblet!
            </h2>
            <p className="text-gray-500">Omdirigerer til dashboardet...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Noe gikk galt
            </h2>
            <p className="text-red-500 mb-2">{error}</p>
            <p className="text-gray-500">Omdirigerer...</p>
          </>
        )}
      </div>
    </div>
  )
}
