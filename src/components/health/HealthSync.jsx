import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Heart, Watch, Upload, RefreshCw, CheckCircle } from 'lucide-react'

export default function HealthSync() {
  const { user } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [healthData, setHealthData] = useState({
    restingHR: '',
    sleep: ''
  })

  const handleGoogleFitConnect = () => {
    // TODO: Implementer Google Fit OAuth
    // For fremtidig implementering av Google Fit API
    setError('Google Fit-integrasjon er ikke implementert ennå. Bruk manuell registrering.')
  }

  const handleAppleHealthImport = () => {
    // TODO: Implementer Apple Health XML import
    // For fremtidig implementering av Apple Health import
    setError('Apple Health import er ikke implementert ennå. Bruk manuell registrering.')
  }

  const handleSaveHealthData = async () => {
    if (!healthData.restingHR && !healthData.sleep) {
      setError('Fyll ut minst ett felt')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const today = new Date().toISOString().split('T')[0]
      const healthDoc = doc(db, `users/${user.uid}/health/${today}`)

      await setDoc(healthDoc, {
        date: new Date(),
        restingHR: healthData.restingHR ? parseInt(healthData.restingHR) : null,
        sleep: healthData.sleep ? parseFloat(healthData.sleep) : null,
        updatedAt: new Date()
      }, { merge: true })

      setSuccess(true)
      setHealthData({ restingHR: '', sleep: '' })

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <Heart className="text-error" />
          Helsedata
        </h1>
        <p className="text-text-secondary mt-1">
          Koble til helseapper for bedre treningsplanlegging
        </p>
      </div>

      {/* Google Fit */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
            <Watch className="text-success" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary">Google Fit</h3>
            <p className="text-sm text-text-muted mt-1">
              Synkroniser automatisk puls, søvn, skritteller og treningsdata
            </p>
            <button
              onClick={handleGoogleFitConnect}
              className="btn-outline mt-3 text-sm"
            >
              <RefreshCw size={16} />
              Koble til Google Fit
            </button>
          </div>
        </div>
      </div>

      {/* Apple Health */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-error/20 flex items-center justify-center">
            <Heart className="text-error" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary">Apple Health</h3>
            <p className="text-sm text-text-muted mt-1">
              Importer data fra Apple Health via XML-eksport
            </p>
            <button
              onClick={handleAppleHealthImport}
              className="btn-outline mt-3 text-sm"
            >
              <Upload size={16} />
              Importer XML-fil
            </button>
          </div>
        </div>
      </div>

      {/* Manual entry */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">Manuell registrering</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Hvilepuls (bpm)</label>
            <input
              type="number"
              placeholder="55"
              className="input"
              value={healthData.restingHR}
              onChange={(e) => setHealthData(prev => ({ ...prev, restingHR: e.target.value }))}
              min="30"
              max="200"
            />
          </div>
          <div>
            <label className="input-label">Søvn (timer)</label>
            <input
              type="number"
              step="0.5"
              placeholder="7.5"
              className="input"
              value={healthData.sleep}
              onChange={(e) => setHealthData(prev => ({ ...prev, sleep: e.target.value }))}
              min="0"
              max="24"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            Helsedata lagret!
          </div>
        )}

        <button
          onClick={handleSaveHealthData}
          disabled={saving}
          className="btn-primary w-full mt-4"
        >
          {saving ? (
            <div className="spinner" />
          ) : (
            'Lagre'
          )}
        </button>
      </div>

      {/* Info */}
      <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
        <h4 className="font-medium text-secondary text-sm">Hvorfor helsedata?</h4>
        <p className="text-xs text-text-muted mt-1">
          Ved å koble til helsedata kan AI-planleggeren ta hensyn til søvnkvalitet, 
          hvilepuls og restitusjon når den lager treningsplaner.
        </p>
      </div>
    </div>
  )
}
