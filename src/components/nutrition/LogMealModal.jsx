import { useState } from 'react'
import { useNutrition } from '../../hooks/useNutrition'
import { analyzeMeal, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '../../services/nutritionService'
import { X, Sparkles, Loader, CheckCircle } from 'lucide-react'

export default function LogMealModal({ date, onClose }) {
  const { addMeal } = useNutrition()
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError('Beskriv hva du spiste')
      return
    }

    setAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      const result = await analyzeMeal(description, mealType)
      setAnalysis(result)
    } catch (err) {
      setError(err.message || 'Kunne ikke analysere måltidet')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!analysis) return

    setSaving(true)
    setError(null)

    try {
      await addMeal({
        date,
        mealType: analysis.mealType || mealType,
        description,
        nutrition: {
          items: analysis.items,
          totals: analysis.totals
        },
        confidence: analysis.confidence,
        suggestions: analysis.suggestions
      })

      onClose()
    } catch (err) {
      setError(err.message || 'Kunne ikke lagre måltidet')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-background-primary rounded-2xl max-w-lg w-full max-h-[82vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-background-primary z-10">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Logg måltid
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-text-muted"
            aria-label="Lukk"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pb-36 space-y-4">
          {/* Meal Type */}
          <div>
            <label className="input-label">Type måltid</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(MEAL_TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={`p-3 rounded-xl border transition-all ${
                    mealType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-background-secondary text-text-secondary hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl block mb-1">{MEAL_TYPE_ICONS[type]}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="meal-description" className="input-label">
              Hva spiste du?
            </label>
            <textarea
              id="meal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="F.eks: 2 egg og 2 brødskiver med brunost, 1 banan"
              rows={3}
              className="input resize-none"
              disabled={analyzing || !!analysis}
            />
            <p className="text-xs text-text-muted mt-1">
              💡 Vær så spesifikk som mulig for best resultat
            </p>
          </div>

          {/* Analyze Button */}
          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={!description.trim() || analyzing}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Analyserer...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Analyser med AI
                </>
              )}
            </button>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2">
                <CheckCircle size={18} className="text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success">Analysert!</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Sikkerhet: {analysis.confidence === 'high' ? 'Høy' : analysis.confidence === 'medium' ? 'Middels' : 'Lav'}
                  </p>
                </div>
              </div>

              {/* Totals */}
              <div className="card bg-background-secondary">
                <h3 className="font-medium text-text-primary mb-3">Totalt</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-success">{analysis.totals.calories}</p>
                    <p className="text-xs text-text-muted">kcal</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{analysis.totals.protein}</p>
                    <p className="text-xs text-text-muted">g protein</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-secondary">{analysis.totals.carbs}</p>
                    <p className="text-xs text-text-muted">g karbo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">{analysis.totals.fat}</p>
                    <p className="text-xs text-text-muted">g fett</p>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="card bg-background-secondary">
                <h3 className="font-medium text-text-primary mb-3">Detaljer</h3>
                <div className="space-y-2">
                  {analysis.items.map((item, index) => (
                    <div key={index} className="flex items-start justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{item.name}</p>
                        <p className="text-xs text-text-muted">{item.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-text-primary">{item.calories} kcal</p>
                        <p className="text-xs text-text-muted">
                          {item.protein}p • {item.carbs}k • {item.fat}f
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              {analysis.suggestions && (
                <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl">
                  <p className="text-sm text-text-secondary">
                    💡 {analysis.suggestions}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAnalysis(null)
                    setDescription('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Start på nytt
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Lagrer...
                    </>
                  ) : (
                    'Lagre måltid'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
