import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X, ArrowUpCircle } from 'lucide-react'

// Detect iOS/iPhone
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [updating, setUpdating] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
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

  const handleUpdate = async () => {
    try {
      setUpdating(true)

      // Aggressive cache clearing to prevent reverting to old versions
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }

      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(key => caches.delete(key)))
      }

      // Force reload from network
      window.location.reload(true)
    } catch (err) {
      console.error('Update failed:', err)
      window.location.reload(true)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up safe-bottom">
      <div className="bg-primary text-white p-1 rounded-full shadow-lg shadow-primary/30 flex items-center border border-primary-light">
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 disabled:opacity-50"
          title="Ny versjon tilgjengelig - Trykk for å oppdatere"
        >
          <RefreshCw size={20} className={updating ? 'animate-spin' : ''} />
          {/* Show text only on wider screens or if it's critical */}
          <span className="font-semibold text-sm whitespace-nowrap">
            {updating ? 'Oppdaterer...' : 'Oppdater app'}
          </span>
        </button>

        <div className="w-[1px] h-6 bg-white/20 mx-1"></div>

        <button
          onClick={close}
          className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95 flex-shrink-0"
          title="Lukk"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
