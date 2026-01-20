import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Activity, Zap, Brain } from 'lucide-react'

export default function LoginScreen() {
  const { signIn, error: authError, loading } = useAuth()
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSignIn = async () => {
    try {
      setError(null)
      await signIn()
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  const displayError = error || authError

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 pointer-events-none" />
      
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-glow-primary">
            <Activity size={40} className="text-white" />
          </div>
        </div>

        <h1 className="font-heading text-3xl font-bold text-text-primary mb-2 animate-slide-up">
          Smart Training
        </h1>
        <p className="text-text-secondary text-center mb-8 animate-slide-up">
          AI-drevet treningsplanlegger
        </p>

        <div className="grid gap-4 mb-10 w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-running/20 flex items-center justify-center">
              <Activity size={20} className="text-running" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Løping og Styrke</h3>
              <p className="text-sm text-text-muted">Spor alle treningsøktene dine</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Brain size={20} className="text-secondary" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">AI Treningsplan</h3>
              <p className="text-sm text-text-muted">Personlig plan generert av AI</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <Zap size={20} className="text-success" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">Smart Analyse</h3>
              <p className="text-sm text-text-muted">Innsikt fra helsedata</p>
            </div>
          </div>
        </div>

        {displayError && (
          <div className="w-full max-w-sm mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm text-center">
            {displayError}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="btn-primary w-full max-w-sm text-lg py-4"
        >
          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Logg inn med Google
            </>
          )}
        </button>

        <p className="mt-6 text-xs text-text-muted text-center">
          Kun autoriserte brukere har tilgang
        </p>
      </div>
    </div>
  )
}
