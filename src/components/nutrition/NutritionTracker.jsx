import { useState, useMemo } from 'react'
import { useNutrition } from '../../hooks/useNutrition'
import { calculateDailyTotals, getMacroPercentages, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '../../services/nutritionService'
import { Apple, Plus, TrendingUp, Flame } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { nb } from 'date-fns/locale'
import LogMealModal from './LogMealModal'
import MealCard from './MealCard'
import NutritionAI from './NutritionAI'

export default function NutritionTracker() {
  const { meals, loading, getMealsForDate } = useNutrition()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showLogModal, setShowLogModal] = useState(false)

  // Hent måltider for valgt dato
  const todaysMeals = useMemo(() => {
    return getMealsForDate(selectedDate)
  }, [getMealsForDate, selectedDate])

  // Beregn totaler for dagen
  const dailyTotals = useMemo(() => {
    return calculateDailyTotals(todaysMeals)
  }, [todaysMeals])

  // Beregn makroprosenter
  const macroPercents = useMemo(() => {
    return getMacroPercentages(
      dailyTotals.protein,
      dailyTotals.carbs,
      dailyTotals.fat
    )
  }, [dailyTotals])

  // Anbefalte daglige verdier (kan customizes basert på brukerprofil)
  const recommended = {
    calories: 2500,
    protein: 150,
    carbs: 300,
    fat: 80
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
            <Apple className="text-success" />
            Matlogging
          </h1>
          <p className="text-text-secondary mt-1">
            {isToday(selectedDate) ? 'I dag' : format(selectedDate, 'd. MMMM', { locale: nb })}
          </p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Logg måltid
        </button>
      </div>

      {/* Daily Overview Card */}
      <div className="card bg-gradient-to-br from-success/20 to-success/5 border-success/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-lg text-text-primary">
            Dagens oversikt
          </h2>
          <div className="flex items-center gap-1 text-sm text-text-muted">
            <Flame size={16} className="text-success" />
            {dailyTotals.mealCount} måltider
          </div>
        </div>

        {/* Calories */}
        <div className="mb-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {dailyTotals.calories}
                <span className="text-lg text-text-muted ml-1">kcal</span>
              </p>
              <p className="text-xs text-text-muted">
                av {recommended.calories} anbefalt
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-success">
                {Math.round((dailyTotals.calories / recommended.calories) * 100)}%
              </p>
            </div>
          </div>
          <div className="w-full bg-background-secondary rounded-full h-2">
            <div
              className="bg-success rounded-full h-2 transition-all duration-300"
              style={{
                width: `${Math.min((dailyTotals.calories / recommended.calories) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-4">
          {/* Protein */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-muted">Protein</p>
              <p className="text-xs font-medium text-primary">{macroPercents.protein}%</p>
            </div>
            <p className="text-lg font-bold text-text-primary">
              {dailyTotals.protein}g
            </p>
            <p className="text-xs text-text-muted">av {recommended.protein}g</p>
            <div className="w-full bg-background-secondary rounded-full h-1.5 mt-2">
              <div
                className="bg-primary rounded-full h-1.5"
                style={{
                  width: `${Math.min((dailyTotals.protein / recommended.protein) * 100, 100)}%`
                }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-muted">Karbo</p>
              <p className="text-xs font-medium text-secondary">{macroPercents.carbs}%</p>
            </div>
            <p className="text-lg font-bold text-text-primary">
              {dailyTotals.carbs}g
            </p>
            <p className="text-xs text-text-muted">av {recommended.carbs}g</p>
            <div className="w-full bg-background-secondary rounded-full h-1.5 mt-2">
              <div
                className="bg-secondary rounded-full h-1.5"
                style={{
                  width: `${Math.min((dailyTotals.carbs / recommended.carbs) * 100, 100)}%`
                }}
              />
            </div>
          </div>

          {/* Fat */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-muted">Fett</p>
              <p className="text-xs font-medium text-warning">{macroPercents.fat}%</p>
            </div>
            <p className="text-lg font-bold text-text-primary">
              {dailyTotals.fat}g
            </p>
            <p className="text-xs text-text-muted">av {recommended.fat}g</p>
            <div className="w-full bg-background-secondary rounded-full h-1.5 mt-2">
              <div
                className="bg-warning rounded-full h-1.5"
                style={{
                  width: `${Math.min((dailyTotals.fat / recommended.fat) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition AI */}
      <NutritionAI />

      {/* Date Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const yesterday = new Date(selectedDate)
            yesterday.setDate(yesterday.getDate() - 1)
            setSelectedDate(yesterday)
          }}
          className="btn-secondary px-3"
        >
          ←
        </button>
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="input flex-1"
        />
        <button
          onClick={() => {
            const tomorrow = new Date(selectedDate)
            tomorrow.setDate(tomorrow.getDate() + 1)
            if (tomorrow <= new Date()) {
              setSelectedDate(tomorrow)
            }
          }}
          className="btn-secondary px-3"
          disabled={isToday(selectedDate)}
        >
          →
        </button>
        {!isToday(selectedDate) && (
          <button
            onClick={() => setSelectedDate(new Date())}
            className="btn-secondary"
          >
            I dag
          </button>
        )}
      </div>

      {/* Meals List */}
      <div>
        <h2 className="font-heading font-semibold text-lg text-text-primary mb-3">
          Måltider
        </h2>

        {todaysMeals.length > 0 ? (
          <div className="space-y-3">
            {/* Group by meal type */}
            {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
              const mealsOfType = todaysMeals.filter(m => m.mealType === mealType)
              if (mealsOfType.length === 0) return null

              return (
                <div key={mealType}>
                  <h3 className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
                    <span className="text-lg">{MEAL_TYPE_ICONS[mealType]}</span>
                    {MEAL_TYPE_LABELS[mealType]}
                  </h3>
                  <div className="space-y-2">
                    {mealsOfType.map(meal => (
                      <MealCard key={meal.id} meal={meal} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Apple size={48} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-muted mb-4">
              Ingen måltider registrert {isToday(selectedDate) ? 'i dag' : 'denne dagen'}
            </p>
            <button
              onClick={() => setShowLogModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Logg første måltid
            </button>
          </div>
        )}
      </div>

      {/* Log Meal Modal */}
      {showLogModal && (
        <LogMealModal
          date={selectedDate}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  )
}
