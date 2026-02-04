import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from 'lucide-react'
import { scaleIn } from '../../utils/animations'
import GlassCard from './GlassCard'
import Button from './Button'

/**
 * ErrorState - Reusable error display component
 * Provides consistent error UI across the app
 */
export default function ErrorState({
  title,
  message,
  error,
  onRetry,
  suggestions = [],
  type = 'error' // 'error' | 'network' | 'server' | 'not-found'
}) {
  // Determine icon and colors based on error type
  const config = {
    error: {
      icon: AlertCircle,
      color: 'error',
      defaultTitle: 'Noe gikk galt',
      defaultMessage: 'En uventet feil oppstod. Prøv igjen.'
    },
    network: {
      icon: WifiOff,
      color: 'warning',
      defaultTitle: 'Nettverksfeil',
      defaultMessage: 'Kunne ikke koble til serveren. Sjekk internettforbindelsen din.'
    },
    server: {
      icon: ServerCrash,
      color: 'error',
      defaultTitle: 'Serverfeil',
      defaultMessage: 'Serveren svarer ikke. Prøv igjen om litt.'
    },
    'not-found': {
      icon: AlertCircle,
      color: 'text-muted',
      defaultTitle: 'Ingen data funnet',
      defaultMessage: 'Vi kunne ikke finne det du leter etter.'
    }
  }[type]

  const Icon = config.icon
  const displayTitle = title || config.defaultTitle
  const displayMessage = message || config.defaultMessage

  // Auto-generate suggestions based on error type
  const autoSuggestions = {
    network: [
      'Sjekk at du er koblet til internett',
      'Prøv å laste siden på nytt',
      'Vent noen sekunder og prøv igjen'
    ],
    server: [
      'Vent noen minutter og prøv igjen',
      'Kontakt support hvis problemet vedvarer'
    ]
  }

  const displaySuggestions = suggestions.length > 0
    ? suggestions
    : (autoSuggestions[type] || [])

  // Safe color mapping for Tailwind purge
  const colorClasses = {
    error: {
      card: 'border-error/50 bg-error/5',
      icon: 'bg-error/10',
      iconColor: 'text-error'
    },
    warning: {
      card: 'border-warning/50 bg-warning/5',
      icon: 'bg-warning/10',
      iconColor: 'text-warning'
    },
    'text-muted': {
      card: 'border-white/10 bg-white/5',
      icon: 'bg-white/10',
      iconColor: 'text-text-muted'
    }
  }[config.color] || {
    card: 'border-error/50 bg-error/5',
    icon: 'bg-error/10',
    iconColor: 'text-error'
  }

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
    >
      <GlassCard className={colorClasses.card}>
        <div className="flex flex-col items-center text-center py-4">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full ${colorClasses.icon} flex items-center justify-center mb-4`}>
            <Icon size={32} className={colorClasses.iconColor} />
          </div>

          {/* Title & Message */}
          <h3 className="text-lg font-bold text-text-primary mb-2">
            {displayTitle}
          </h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md">
            {displayMessage}
          </p>

          {/* Error details (dev mode) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="w-full mb-4 text-left">
              <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
                Technical details (dev only)
              </summary>
              <div className="mt-2 p-3 bg-black/20 rounded-lg">
                <pre className="text-xs text-error font-mono overflow-auto">
                  {error.toString()}
                </pre>
                {error.stack && (
                  <pre className="text-xs text-text-muted mt-2 overflow-auto">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Suggestions */}
          {displaySuggestions.length > 0 && (
            <div className="w-full text-left bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">
                Forslag:
              </p>
              <ul className="space-y-1">
                {displaySuggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm text-text-secondary">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Retry button */}
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="primary"
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Prøv igjen
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

/**
 * Lightweight inline error component for smaller spaces
 */
export function InlineError({ message, onRetry }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-error/5 border border-error/20 rounded-lg">
      <AlertCircle size={18} className="text-error mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-text-secondary">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:text-primary-light mt-1"
          >
            Prøv igjen
          </button>
        )}
      </div>
    </div>
  )
}
