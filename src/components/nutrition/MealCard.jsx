import { useState } from 'react'
import { useNutrition } from '../../hooks/useNutrition'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function MealCard({ meal }) {
  const { deleteMeal } = useNutrition()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Er du sikker på at du vil slette dette måltidet?')) return

    setDeleting(true)
    try {
      await deleteMeal(meal.id)
    } catch (err) {
      console.error('Failed to delete meal:', err)
      alert('Kunne ikke slette måltidet')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-text-primary line-clamp-2">
            {meal.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span className="font-medium text-success">
              {meal.nutrition?.totals?.calories || 0} kcal
            </span>
            <span>P: {meal.nutrition?.totals?.protein || 0}g</span>
            <span>K: {meal.nutrition?.totals?.carbs || 0}g</span>
            <span>F: {meal.nutrition?.totals?.fat || 0}g</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-white/5 text-text-muted"
            aria-label={expanded ? 'Skjul detaljer' : 'Vis detaljer'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-lg hover:bg-error/10 text-error"
            aria-label="Slett måltid"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && meal.nutrition?.items && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          {meal.nutrition.items.map((item, index) => (
            <div key={index} className="flex items-start justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium text-text-secondary">{item.name}</p>
                <p className="text-xs text-text-muted">{item.amount}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-text-secondary">{item.calories} kcal</p>
                <p className="text-xs text-text-muted">
                  {item.protein}p • {item.carbs}k • {item.fat}f
                </p>
              </div>
            </div>
          ))}

          {meal.suggestions && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-secondary">
                💡 {meal.suggestions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
