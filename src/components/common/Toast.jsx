import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle size={20} className="text-success" />,
    error: <XCircle size={20} className="text-error" />,
    warning: <AlertCircle size={20} className="text-warning" />,
    info: <Info size={20} className="text-primary" />
  }

  const styles = {
    success: 'bg-success/10 border-success/20 text-success',
    error: 'bg-error/10 border-error/20 text-error',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-primary/10 border-primary/20 text-primary'
  }

  return (
    <div className={`
      fixed top-20 left-1/2 -translate-x-1/2 z-[100]
      max-w-md w-full mx-4
      ${styles[type]}
      border rounded-2xl p-4 shadow-2xl
      animate-slide-in-right
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={16} className="text-text-muted" />
        </button>
      </div>
    </div>
  )
}
