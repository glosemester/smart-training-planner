import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

// Detect iOS/iPhone
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Sjekk for oppdateringer hver time
      console.log('SW Registered:', r)
      if (r) {
        setInterval(() => {
          console.log('Checking for updates...')
          r.update().catch(err => {
            console.error('Update check failed:', err)
          })
        }, 60 * 60 * 1000) // Sjekk hver time
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
      setError('Kunne ikke registrere service worker')
    },
  })

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true)
    }
  }, [needRefresh])

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
    setShowPrompt(false)
    setError(null)
  }

  const handleUpdate = async () => {
    try {
      setUpdating(true)
      setError(null)

      // For iOS: Force a hard reload after service worker update
      if (isIOS()) {
        await updateServiceWorker(true)
        // Wait a bit for SW to activate
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        await updateServiceWorker(true)
      }
    } catch (err) {
      console.error('Update failed:', err)
      setError('Oppdatering feilet. Prøv å laste siden på nytt manuelt.')
      setUpdating(false)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm safe-bottom">
      <div className="card bg-primary text-white shadow-2xl border-primary/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={20} className={updating ? 'animate-spin' : ''} />
          </div>

          <div className="flex-1">
            <h3 className="font-medium mb-1">
              {updating ? 'Oppdaterer...' : 'Ny versjon tilgjengelig!'}
            </h3>
            <p className="text-sm text-white/90 mb-3">
              {updating
                ? 'Vennligst vent mens appen oppdateres...'
                : isIOS()
                  ? 'En oppdatering er klar. Appen vil laste på nytt.'
                  : 'En oppdatering av appen er klar. Klikk for å laste inn siste versjon.'}
            </p>

            {error && (
              <p className="text-sm text-red-200 mb-3 bg-red-900/30 p-2 rounded">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-white text-primary rounded-lg font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {updating ? 'Oppdaterer...' : 'Oppdater nå'}
              </button>

              {!updating && (
                <button
                  onClick={close}
                  className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors active:scale-95"
                  aria-label="Lukk"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
