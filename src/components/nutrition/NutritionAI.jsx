import { useState } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useNutrition } from '../../hooks/useNutrition'
import { Sparkles, Send, Loader, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { startOfWeek, endOfWeek } from 'date-fns'

export default function NutritionAI() {
  const { workouts } = useWorkouts()
  const { meals, getMealsForDate } = useNutrition()
  const [isExpanded, setIsExpanded] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [conversation, setConversation] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userInput.trim() || isLoading) return

    const userMessage = userInput.trim()
    setUserInput('')

    // Add user message to conversation
    setConversation(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Get this week's workouts for context
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

      const thisWeekWorkouts = workouts.filter(w => {
        const date = new Date(w.date)
        return date >= weekStart && date <= weekEnd
      })

      // Get this week's meals
      const thisWeekMeals = []
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dayMeals = getMealsForDate(new Date(d))
        thisWeekMeals.push(...dayMeals)
      }

      // Build context
      const context = {
        workouts: thisWeekWorkouts.map(w => ({
          date: w.date,
          type: w.type,
          title: w.title,
          duration: w.duration,
          distance: w.running?.distance,
          rpe: w.rpe
        })),
        meals: thisWeekMeals.map(m => ({
          date: m.date,
          mealType: m.mealType,
          name: m.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat
        })),
        conversationHistory: conversation
      }

      const response = await fetch('/.netlify/functions/nutrition-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      // Add AI response to conversation
      setConversation(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('AI error:', error)
      toast.error('Kunne ikke få svar fra AI')
      // Remove the user message if AI fails
      setConversation(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts = [
    'Gi meg en ukesplan for å gå ned i vekt',
    'Hva bør jeg spise før hard treningsøkt?',
    'Lag en dagsmeny tilpasset min treningsbelastning',
    'Tips for å øke proteininntak',
    'Hvordan balansere karbo basert på treningsuka mi?'
  ]

  if (!isExpanded) {
    return (
      <div className="card bg-gradient-to-br from-ai/10 to-ai/5 border-ai/20 cursor-pointer hover:scale-[1.01] transition-all"
           onClick={() => setIsExpanded(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-ai/20 flex items-center justify-center">
              <Sparkles className="text-ai" size={24} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-text-primary dark:text-text-primary">
                Ernærings-AI
              </h3>
              <p className="text-sm text-text-secondary dark:text-text-secondary">
                Få personlige måltidsråd basert på din trening
              </p>
            </div>
          </div>
          <ChevronDown className="text-text-muted dark:text-text-muted" size={20} />
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-gradient-to-br from-ai/10 to-ai/5 border-ai/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setIsExpanded(false)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ai/20 flex items-center justify-center">
            <Sparkles className="text-ai" size={20} />
          </div>
          <h3 className="font-heading font-bold text-text-primary dark:text-text-primary">
            Ernærings-AI
          </h3>
        </div>
        <ChevronUp className="text-text-muted dark:text-text-muted" size={20} />
      </div>

      {/* Conversation */}
      {conversation.length > 0 && (
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-primary/10 ml-8'
                  : 'bg-white/50 dark:bg-white/5 mr-8'
              }`}
            >
              <p className="text-sm text-gray-900 dark:text-text-primary whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
          {isLoading && (
            <div className="bg-white/50 dark:bg-white/5 mr-8 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Loader className="animate-spin text-ai" size={16} />
                <p className="text-sm text-text-muted dark:text-text-muted">Tenker...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick prompts */}
      {conversation.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-muted dark:text-text-muted mb-2 font-medium">
            FORSLAG:
          </p>
          <div className="space-y-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setUserInput(prompt)
                }}
                className="w-full text-left p-2 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-sm text-gray-900 dark:text-text-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="F.eks: Gi meg en ukesplan for å gå ned i vekt..."
          className="input flex-1"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          className="btn-primary px-4 disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>

      {/* Info text */}
      <p className="text-xs text-text-muted dark:text-text-muted mt-3 text-center">
        AI tar hensyn til dine treningsøkter og ernæringsmål denne uken
      </p>
    </div>
  )
}
