import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Sjekk for oppdateringer hver time
      console.log('SW Registered:', r)
      r && setInterval(() => {
        console.log('Checking for updates...')
        r.update()
      }, 60 * 60 * 1000) // Sjekk hver time
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
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
  }

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="card bg-primary text-white shadow-2xl border-primary/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={20} />
          </div>

          <div className="flex-1">
            <h3 className="font-medium mb-1">Ny versjon tilgjengelig!</h3>
            <p className="text-sm text-white/90 mb-3">
              En oppdatering av appen er klar. Klikk for å laste inn siste versjon.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-white text-primary rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
              >
                Oppdater nå
              </button>

              <button
                onClick={close}
                className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                aria-label="Lukk"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
