import { useState } from 'react'
import { Target, Plus, X, Edit2, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function VitalGoals() {
  const [isOpen, setIsOpen] = useState(false)
  const [goals, setGoals] = useState([
    { id: 1, text: 'Løp Hyrox under 1:30:00', completed: false },
    { id: 2, text: 'Deadlift 150kg', completed: false },
  ])
  const [newGoal, setNewGoal] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const handleAddGoal = () => {
    if (!newGoal.trim()) return

    const goal = {
      id: Date.now(),
      text: newGoal.trim(),
      completed: false
    }

    setGoals([...goals, goal])
    setNewGoal('')
    toast.success('Mål lagt til!')
  }

  const handleToggleComplete = (id) => {
    setGoals(goals.map(g =>
      g.id === id ? { ...g, completed: !g.completed } : g
    ))
  }

  const handleDelete = (id) => {
    setGoals(goals.filter(g => g.id !== id))
    toast.success('Mål fjernet')
  }

  const handleStartEdit = (goal) => {
    setEditingId(goal.id)
    setEditText(goal.text)
  }

  const handleSaveEdit = (id) => {
    if (!editText.trim()) return

    setGoals(goals.map(g =>
      g.id === id ? { ...g, text: editText.trim() } : g
    ))
    setEditingId(null)
    setEditText('')
    toast.success('Mål oppdatert')
  }

  const activeGoals = goals.filter(g => !g.completed)
  const completedGoals = goals.filter(g => g.completed)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="card hover:scale-[1.02] transition-all duration-200 flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Target className="text-primary" size={24} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-heading font-bold text-text-primary dark:text-text-primary">
            Vitale Mål
          </h3>
          <p className="text-sm text-text-secondary dark:text-text-secondary">
            {activeGoals.length} aktive mål
          </p>
        </div>
        <Plus className="text-primary" size={20} />
      </button>
    )
  }

  return (
    <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Target className="text-primary" size={20} />
          </div>
          <h3 className="font-heading font-bold text-lg text-text-primary dark:text-text-primary">
            Vitale Mål
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/10 dark:hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={20} className="text-text-muted dark:text-text-muted" />
        </button>
      </div>

      {/* Add new goal */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
            placeholder="Legg til nytt mål..."
            className="input flex-1"
          />
          <button
            onClick={handleAddGoal}
            className="btn-primary px-4"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-text-muted dark:text-text-muted font-medium uppercase tracking-wide">
            Aktive
          </p>
          {activeGoals.map(goal => (
            <div
              key={goal.id}
              className="flex items-center gap-2 p-3 bg-white/5 dark:bg-white/5 rounded-xl group"
            >
              <button
                onClick={() => handleToggleComplete(goal.id)}
                className="w-5 h-5 rounded border-2 border-text-muted dark:border-text-muted flex items-center justify-center hover:border-primary transition-colors"
              >
                {goal.completed && <Check size={14} className="text-primary" />}
              </button>

              {editingId === goal.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(goal.id)}
                  onBlur={() => handleSaveEdit(goal.id)}
                  className="input flex-1 py-1 text-sm"
                  autoFocus
                />
              ) : (
                <p className="flex-1 text-sm text-text-primary dark:text-text-primary">
                  {goal.text}
                </p>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleStartEdit(goal)}
                  className="p-1 hover:bg-white/10 dark:hover:bg-white/10 rounded"
                >
                  <Edit2 size={14} className="text-text-muted dark:text-text-muted" />
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-1 hover:bg-white/10 dark:hover:bg-white/10 rounded"
                >
                  <X size={14} className="text-text-muted dark:text-text-muted" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted dark:text-text-muted font-medium uppercase tracking-wide">
            Fullført
          </p>
          {completedGoals.map(goal => (
            <div
              key={goal.id}
              className="flex items-center gap-2 p-3 bg-success/10 rounded-xl group"
            >
              <button
                onClick={() => handleToggleComplete(goal.id)}
                className="w-5 h-5 rounded border-2 border-success flex items-center justify-center"
              >
                <Check size={14} className="text-success" />
              </button>

              <p className="flex-1 text-sm text-text-muted dark:text-text-muted line-through">
                {goal.text}
              </p>

              <button
                onClick={() => handleDelete(goal.id)}
                className="p-1 hover:bg-white/10 dark:hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} className="text-text-muted dark:text-text-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="text-center py-8">
          <Target className="text-text-muted dark:text-text-muted mx-auto mb-2" size={32} />
          <p className="text-text-muted dark:text-text-muted text-sm">
            Ingen mål lagt til ennå
          </p>
        </div>
      )}
    </div>
  )
}
