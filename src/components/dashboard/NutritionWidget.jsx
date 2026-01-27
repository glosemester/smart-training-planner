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
        <div className="card border-dashed border-2 flex items-center justify-between hover:border-success/50 hover:bg-success/5 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-success/20 transition-colors">
              <Apple className="text-gray-400 group-hover:text-success" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Mat i dag</p>
              <p className="text-xs text-gray-500">Logg ditt første måltid</p>
            </div>
          </div>
          <Plus size={20} className="text-gray-400 group-hover:text-success" />
        </div>
      </Link>
    )
  }

  const caloriesPercent = Math.round((todaysNutrition.calories / recommended.calories) * 100)

  return (
    <Link to="/nutrition" className="block group">
      <div className="card hover:border-success/30 transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Apple className="text-success" size={20} />
            </div>
            <div>
              <p className="text-xs text-success font-medium uppercase tracking-wide">
                Mat i dag
              </p>
              <p className="font-heading font-bold text-xl text-gray-900 dark:text-white mt-0.5">
                {todaysNutrition.calories} kcal
              </p>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-success transition-colors" size={20} />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>{todaysNutrition.mealCount} måltider</span>
            <span className="font-medium">{caloriesPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-success rounded-full h-full transition-all duration-300"
              style={{
                width: `${Math.min(caloriesPercent, 100)}%`
              }}
            />
          </div>
        </div>

        {/* Macros mini */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="text-center">
            <span className="block text-gray-500 mb-0.5">Protein</span>
            <span className="font-bold text-gray-900 dark:text-white">{todaysNutrition.protein}g</span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
          <div className="text-center">
            <span className="block text-gray-500 mb-0.5">Karbo</span>
            <span className="font-bold text-gray-900 dark:text-white">{todaysNutrition.carbs}g</span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
          <div className="text-center">
            <span className="block text-gray-500 mb-0.5">Fett</span>
            <span className="font-bold text-gray-900 dark:text-white">{todaysNutrition.fat}g</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
