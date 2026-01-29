import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Target, Save, Plus, X } from 'lucide-react'

export default function GoalSetting() {
  const { userProfile, updateProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  const [goals, setGoals] = useState({
    primary: userProfile?.goals?.primary || '',
    secondary: userProfile?.goals?.secondary || [],
    weeklyTargets: {
      runningKm: userProfile?.goals?.weeklyTargets?.runningKm || 0,
      strengthSessions: userProfile?.goals?.weeklyTargets?.strengthSessions || 0
    }
  })

  const [newSecondary, setNewSecondary] = useState('')

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ goals })
    } finally {
      setSaving(false)
    }
  }

  const addSecondaryGoal = () => {
    if (newSecondary.trim()) {
      setGoals(prev => ({
        ...prev,
        secondary: [...prev.secondary, newSecondary.trim()]
      }))
      setNewSecondary('')
    }
  }

  const removeSecondaryGoal = (index) => {
    setGoals(prev => ({
      ...prev,
      secondary: prev.secondary.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <Target className="text-success" />
          Mine mål
        </h1>
        <p className="text-text-secondary mt-1">
          Dine mål former planen
        </p>
      </div>

      {/* Hovedmål */}
      <div className="card">
        <label className="input-label">Hovedmål</label>
        <input
          type="text"
          value={goals.primary}
          onChange={(e) => setGoals(prev => ({ ...prev, primary: e.target.value }))}
          placeholder="F.eks. 65km ultramarathon mai 2026"
          className="input"
        />
        <p className="text-xs text-text-muted mt-2">
          Ditt viktigste treningsmål
        </p>
      </div>

      {/* Delmål */}
      <div className="card">
        <label className="input-label">Delmål</label>
        <div className="space-y-2 mb-3">
          {goals.secondary.map((goal, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-background-secondary rounded-lg">
              <span className="flex-1 text-sm">{goal}</span>
              <button
                onClick={() => removeSecondaryGoal(idx)}
                className="p-1 hover:bg-error/20 rounded text-error"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSecondary}
            onChange={(e) => setNewSecondary(e.target.value)}
            placeholder="Legg til delmål"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addSecondaryGoal()}
          />
          <button onClick={addSecondaryGoal} className="btn-outline">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Ukentlige mål */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">Ukentlige mål</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Ønsket km/uke</label>
            <input
              type="number"
              value={goals.weeklyTargets.runningKm}
              onChange={(e) => setGoals(prev => ({
                ...prev,
                weeklyTargets: { ...prev.weeklyTargets, runningKm: parseInt(e.target.value) || 0 }
              }))}
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Styrkeøkter per uke</label>
            <input
              type="number"
              value={goals.weeklyTargets.strengthSessions}
              onChange={(e) => setGoals(prev => ({
                ...prev,
                weeklyTargets: { ...prev.weeklyTargets, strengthSessions: parseInt(e.target.value) || 0 }
              }))}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full py-4"
      >
        {saving ? <div className="spinner" /> : <><Save size={20} /> Lagre mål</>}
      </button>
    </div>
  )
}
