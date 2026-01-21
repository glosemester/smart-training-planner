import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNutrition } from '../../hooks/useNutrition'
import { calculateDailyTotals } from '../../services/nutritionService'
import { Apple, ChevronRight, Plus } from 'lucide-react'
import { startOfDay } from 'date-fns'

export default function NutritionWidget() {
  const { meals } = useNutrition()

  // Calculate today's nutrition
  const todaysNutrition = useMemo(() => {
    const today = startOfDay(new Date())
    const todaysMeals = meals.filter(meal => {
      const mealDate = startOfDay(new Date(meal.date))
      return mealDate.getTime() === today.getTime()
    })

    if (todaysMeals.length === 0) return null

    const totals = calculateDailyTotals(todaysMeals)
    return { ...totals, mealCount: todaysMeals.length }
  }, [meals])

  // Recommended daily values (can be customized based on user profile)
  const recommended = {
    calories: 2500,
    protein: 150,
    carbs: 300,
    fat: 80
  }

  // No meals yet today
  if (!todaysNutrition) {
    return (
      <Link to="/nutrition" className="block">
        <div className="card border-success/20 hover:bg-white/5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Apple className="text-success" size={20} />
              </div>
              <div>
                <p className="font-medium text-text-primary">Mat i dag</p>
                <p className="text-xs text-text-muted mt-0.5">Ingen måltider registrert</p>
              </div>
            </div>
            <Plus size={20} className="text-text-muted" />
          </div>
        </div>
      </Link>
    )
  }

  const caloriesPercent = Math.round((todaysNutrition.calories / recommended.calories) * 100)

  return (
    <Link to="/nutrition" className="block">
      <div className="card bg-gradient-to-br from-success/20 to-success/5 border-success/20 hover:bg-success/10 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <Apple className="text-success" size={20} />
            </div>
            <div>
              <p className="text-xs text-success font-medium uppercase tracking-wide">
                Mat i dag
              </p>
              <p className="font-heading font-bold text-lg text-text-primary mt-0.5">
                {todaysNutrition.calories} kcal
              </p>
            </div>
          </div>
          <ChevronRight className="text-success" size={20} />
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>{todaysNutrition.mealCount} måltider</span>
            <span>{caloriesPercent}% av {recommended.calories}</span>
          </div>
          <div className="w-full bg-background-secondary rounded-full h-2">
            <div
              className="bg-success rounded-full h-2 transition-all duration-300"
              style={{
                width: `${Math.min(caloriesPercent, 100)}%`
              }}
            />
          </div>
        </div>

        {/* Macros mini */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-text-muted">P: </span>
            <span className="text-text-primary font-medium">{todaysNutrition.protein}g</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-text-muted">K: </span>
            <span className="text-text-primary font-medium">{todaysNutrition.carbs}g</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-text-muted">F: </span>
            <span className="text-text-primary font-medium">{todaysNutrition.fat}g</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
