import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat,
  Calendar,
  ShoppingBag,
  Flame,
  Apple,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Refrigerator,
  Plus,
  X
} from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../hooks/useAuth'
import { useWorkouts } from '../hooks/useWorkouts'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations'
import toast from 'react-hot-toast'

export default function NutritionPlanner() {
  const { userProfile } = useAuth()
  const { workouts } = useWorkouts()

  // Form state
  const [weeklyTrainingHours, setWeeklyTrainingHours] = useState(5)
  const [goal, setGoal] = useState('maintain') // 'bulk' | 'cut' | 'maintain'
  const [dietaryPreferences, setDietaryPreferences] = useState('')
  const [allergies, setAllergies] = useState('')

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [mealPlan, setMealPlan] = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)
  const [error, setError] = useState(null)

  // Smart Fridge state
  const [ingredients, setIngredients] = useState([])
  const [ingredientInput, setIngredientInput] = useState('')
  const [fridgeMealType, setFridgeMealType] = useState('dinner')
  const [fridgeCalories, setFridgeCalories] = useState(600)
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false)
  const [recipes, setRecipes] = useState(null)
  const [fridgeError, setFridgeError] = useState(null)

  // Calculate average weekly training hours from recent workouts
  const averageWeeklyHours = useMemo(() => {
    if (!workouts || workouts.length === 0) return 5

    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const recentWorkouts = workouts.filter(w => new Date(w.date) >= fourWeeksAgo)
    const totalMinutes = recentWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
    const weeklyMinutes = totalMinutes / 4

    return Math.round(weeklyMinutes / 60 * 10) / 10 // Round to 1 decimal
  }, [workouts])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const functions = getFunctions()
      const generateMealPlanFn = httpsCallable(functions, 'generateMealPlan')

      const result = await generateMealPlanFn({
        weeklyTrainingHours,
        goal,
        dietaryPreferences: dietaryPreferences || null,
        allergies: allergies || null
      })

      setMealPlan(result.data)
      toast.success('Matplan generert!', {
        icon: '🍽️'
      })
      setExpandedDay(0) // Auto-expand first day
    } catch (err) {
      console.error('Meal plan generation error:', err)
      setError(err.message || 'Kunne ikke generere matplan')
      toast.error('Feil ved generering av matplan')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportShoppingList = () => {
    if (!mealPlan?.shoppingList) return

    const sl = mealPlan.shoppingList
    let text = '🛒 HANDLELISTE\n\n'

    if (sl.proteins?.length) text += '🍖 PROTEIN:\n' + sl.proteins.map(i => `- ${i}`).join('\n') + '\n\n'
    if (sl.carbs?.length) text += '🍚 KARBOHYDRATER:\n' + sl.carbs.map(i => `- ${i}`).join('\n') + '\n\n'
    if (sl.vegetables?.length) text += '🥬 GRØNNSAKER:\n' + sl.vegetables.map(i => `- ${i}`).join('\n') + '\n\n'
    if (sl.dairy?.length) text += '🥛 MEIERI:\n' + sl.dairy.map(i => `- ${i}`).join('\n') + '\n\n'
    if (sl.other?.length) text += '🧂 ANNET:\n' + sl.other.map(i => `- ${i}`).join('\n') + '\n\n'

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'handleliste.txt'
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Handleliste lastet ned!')
  }

  // Smart Fridge functions
  const addIngredient = () => {
    if (!ingredientInput.trim()) return
    setIngredients([...ingredients, ingredientInput.trim()])
    setIngredientInput('')
  }

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      toast.error('Legg til minst en ingrediens')
      return
    }

    setIsGeneratingRecipes(true)
    setFridgeError(null)

    try {
      const functions = getFunctions()
      const generateRecipeFn = httpsCallable(functions, 'generateRecipeFromIngredients')

      const result = await generateRecipeFn({
        ingredients,
        mealType: fridgeMealType,
        calories: fridgeCalories
      })

      setRecipes(result.data)
      toast.success('Oppskrifter generert!', {
        icon: '👨‍🍳'
      })
    } catch (err) {
      console.error('Recipe generation error:', err)
      setFridgeError(err.message || 'Kunne ikke generere oppskrifter')
      toast.error('Feil ved generering av oppskrifter')
    } finally {
      setIsGeneratingRecipes(false)
    }
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="w-full max-w-4xl mx-auto space-y-6 pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <ChefHat size={24} className="text-background" />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
            AI Matplanlegger
          </h1>
          <p className="text-text-secondary text-sm">
            Personlig ernæringsplan tilpasset din trening
          </p>
        </div>
      </div>

      {/* Input Form */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Lag din plan</h2>

        <div className="space-y-4">
          {/* Training Hours */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Ukentlig treningsmengde
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={weeklyTrainingHours}
                onChange={(e) => setWeeklyTrainingHours(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-2xl font-bold text-primary w-20 text-right">
                {weeklyTrainingHours}t
              </span>
            </div>
            {averageWeeklyHours > 0 && (
              <p className="text-xs text-text-muted mt-1">
                Siste 4 uker: {averageWeeklyHours}t/uke
              </p>
            )}
          </div>

          {/* Goal Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Mål
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'cut', label: 'Gå ned', icon: '📉' },
                { value: 'maintain', label: 'Vedlikehold', icon: '⚖️' },
                { value: 'bulk', label: 'Bygge muskler', icon: '💪' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setGoal(option.value)}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    goal === option.value
                      ? 'border-primary bg-primary/10 text-text-primary'
                      : 'border-white/10 bg-black/20 text-text-secondary hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Preferences */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Mat-preferanser (valgfritt)
            </label>
            <input
              type="text"
              value={dietaryPreferences}
              onChange={(e) => setDietaryPreferences(e.target.value)}
              placeholder="F.eks. vegetar, lavkarbo, pescetarian..."
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Allergier / Intoleranse (valgfritt)
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="F.eks. laktose, gluten, nøtter..."
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="primary"
            className="w-full h-12 text-base font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Genererer plan...
              </>
            ) : (
              <>
                <ChefHat size={20} />
                Generer matplan
              </>
            )}
          </Button>
        </div>
      </GlassCard>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard className="border-error/50 bg-error/5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-error mt-0.5" />
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Noe gikk galt</h3>
                  <p className="text-sm text-text-secondary">{error}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Plan Results */}
      <AnimatePresence>
        {mealPlan && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Summary Card */}
            <motion.div variants={staggerItem}>
              <GlassCard className="border-success/30 bg-success/5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={20} className="text-success" />
                  <h2 className="text-lg font-semibold text-text-primary">Din personlige plan</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/20 p-4 rounded-lg">
                    <Flame size={18} className="text-primary mb-2" />
                    <p className="text-2xl font-bold text-text-primary">
                      {mealPlan.summary?.targetCalories || 0}
                    </p>
                    <p className="text-xs text-text-muted">kcal/dag</p>
                  </div>

                  <div className="bg-black/20 p-4 rounded-lg">
                    <Apple size={18} className="text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-text-primary">
                      {mealPlan.summary?.macros?.protein || 0}g
                    </p>
                    <p className="text-xs text-text-muted">Protein</p>
                  </div>

                  <div className="bg-black/20 p-4 rounded-lg">
                    <Apple size={18} className="text-yellow-400 mb-2" />
                    <p className="text-2xl font-bold text-text-primary">
                      {mealPlan.summary?.macros?.carbs || 0}g
                    </p>
                    <p className="text-xs text-text-muted">Karbs</p>
                  </div>

                  <div className="bg-black/20 p-4 rounded-lg">
                    <Apple size={18} className="text-orange-400 mb-2" />
                    <p className="text-2xl font-bold text-text-primary">
                      {mealPlan.summary?.macros?.fat || 0}g
                    </p>
                    <p className="text-xs text-text-muted">Fett</p>
                  </div>
                </div>

                {/* Tips */}
                {mealPlan.tips && mealPlan.tips.length > 0 && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <h3 className="text-sm font-semibold text-primary mb-2">💡 Tips:</h3>
                    <ul className="space-y-1">
                      {mealPlan.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-text-secondary">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Shopping List */}
            <motion.div variants={staggerItem}>
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={20} className="text-primary" />
                    <h2 className="text-lg font-semibold text-text-primary">Handleliste</h2>
                  </div>
                  <Button
                    onClick={exportShoppingList}
                    variant="outline"
                    size="sm"
                  >
                    <Download size={16} />
                    Last ned
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {mealPlan.shoppingList?.proteins && (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">🍖 Protein</h3>
                      <ul className="space-y-1">
                        {mealPlan.shoppingList.proteins.map((item, i) => (
                          <li key={i} className="text-sm text-text-secondary">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mealPlan.shoppingList?.carbs && (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">🍚 Karbohydrater</h3>
                      <ul className="space-y-1">
                        {mealPlan.shoppingList.carbs.map((item, i) => (
                          <li key={i} className="text-sm text-text-secondary">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mealPlan.shoppingList?.vegetables && (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">🥬 Grønnsaker</h3>
                      <ul className="space-y-1">
                        {mealPlan.shoppingList.vegetables.map((item, i) => (
                          <li key={i} className="text-sm text-text-secondary">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mealPlan.shoppingList?.dairy && (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">🥛 Meieri</h3>
                      <ul className="space-y-1">
                        {mealPlan.shoppingList.dairy.map((item, i) => (
                          <li key={i} className="text-sm text-text-secondary">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mealPlan.shoppingList?.other && (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">🧂 Annet</h3>
                      <ul className="space-y-1">
                        {mealPlan.shoppingList.other.map((item, i) => (
                          <li key={i} className="text-sm text-text-secondary">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Daily Plans */}
            <motion.div variants={staggerItem} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">7-dagers plan</h2>
              </div>

              {mealPlan.days?.map((day, dayIndex) => (
                <GlassCard key={dayIndex} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedDay(expandedDay === dayIndex ? null : dayIndex)}
                    className="w-full flex items-center justify-between p-0 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{dayIndex + 1}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-text-primary">{day.day}</h3>
                        <p className="text-xs text-text-muted">
                          {day.totalCalories} kcal · {day.totalProtein}g protein
                        </p>
                      </div>
                    </div>
                    {expandedDay === dayIndex ? (
                      <ChevronUp size={20} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={20} className="text-text-muted" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedDay === dayIndex && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-white/5 mt-4 space-y-3">
                          {day.meals?.map((meal, mealIndex) => (
                            <div
                              key={mealIndex}
                              className="p-4 bg-black/20 rounded-lg border border-white/5"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <span className="text-xs text-primary font-medium uppercase tracking-wider">
                                    {meal.type}
                                  </span>
                                  <h4 className="font-semibold text-text-primary mt-1">
                                    {meal.name}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1 text-text-muted">
                                  <Clock size={14} />
                                  <span className="text-xs">{meal.prepTime} min</span>
                                </div>
                              </div>

                              <p className="text-sm text-text-secondary mb-3">{meal.description}</p>

                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                  {meal.calories} kcal
                                </span>
                                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                                  P: {meal.protein}g
                                </span>
                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                                  K: {meal.carbs}g
                                </span>
                                <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs">
                                  F: {meal.fat}g
                                </span>
                              </div>

                              {meal.ingredients && meal.ingredients.length > 0 && (
                                <details className="text-xs text-text-muted">
                                  <summary className="cursor-pointer hover:text-text-secondary transition-colors">
                                    Ingredienser
                                  </summary>
                                  <ul className="mt-2 space-y-1 pl-4">
                                    {meal.ingredients.map((ing, i) => (
                                      <li key={i}>• {ing}</li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Fridge Section */}
      <motion.div
        variants={fadeInUp}
        className="mt-12 border-t border-white/5 pt-8"
      >
        {/* Smart Fridge Header */}
        <div className="flex items-center gap-3 px-1 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Refrigerator size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-text-primary tracking-tight">
              Smart Kjøleskap
            </h2>
            <p className="text-text-secondary text-sm">
              Få oppskrifter basert på det du har hjemme
            </p>
          </div>
        </div>

        {/* Ingredient Input */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Hva har du i kjøleskapet?</h3>

          <div className="space-y-4">
            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                placeholder="F.eks. kylling, paprika, ris..."
                className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
              />
              <Button
                onClick={addIngredient}
                variant="outline"
                className="px-4"
              >
                <Plus size={18} />
              </Button>
            </div>

            {/* Ingredients list */}
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full"
                  >
                    <span className="text-sm text-text-primary">{ing}</span>
                    <button
                      onClick={() => removeIngredient(i)}
                      className="text-text-muted hover:text-error transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Måltid
                </label>
                <select
                  value={fridgeMealType}
                  onChange={(e) => setFridgeMealType(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-text-primary focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="breakfast">Frokost</option>
                  <option value="lunch">Lunsj</option>
                  <option value="dinner">Middag</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Kalori-mål: {fridgeCalories} kcal
                </label>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="50"
                  value={fridgeCalories}
                  onChange={(e) => setFridgeCalories(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateRecipes}
              disabled={isGeneratingRecipes || ingredients.length === 0}
              variant="primary"
              className="w-full h-12 text-base font-semibold"
            >
              {isGeneratingRecipes ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Genererer oppskrifter...
                </>
              ) : (
                <>
                  <ChefHat size={20} />
                  Generer oppskrifter
                </>
              )}
            </Button>
          </div>
        </GlassCard>

        {/* Fridge Error State */}
        <AnimatePresence>
          {fridgeError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4"
            >
              <GlassCard className="border-error/50 bg-error/5">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-error mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">Noe gikk galt</h3>
                    <p className="text-sm text-text-secondary">{fridgeError}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recipe Results */}
        <AnimatePresence>
          {recipes && recipes.recipes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 size={20} className="text-success" />
                <h3 className="text-lg font-semibold text-text-primary">Oppskrifter</h3>
              </div>

              {recipes.recipes.map((recipe, i) => (
                <GlassCard key={i} className="border-success/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-xl font-bold text-text-primary">{recipe.name}</h4>
                      <p className="text-sm text-text-secondary mt-1">{recipe.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      recipe.difficulty === 'easy' ? 'bg-success/10 text-success' :
                      recipe.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-error/10 text-error'
                    }`}>
                      {recipe.difficulty === 'easy' ? 'Lett' :
                       recipe.difficulty === 'medium' ? 'Middels' : 'Vanskelig'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-black/20 rounded-lg text-text-muted">
                      <Clock size={14} />
                      <span className="text-xs">{recipe.cookTime} min</span>
                    </div>
                    <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                      {recipe.servings} porsjoner
                    </div>
                    {recipe.nutrition && (
                      <>
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {recipe.nutrition.calories} kcal
                        </span>
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                          P: {recipe.nutrition.protein}g
                        </span>
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                          K: {recipe.nutrition.carbs}g
                        </span>
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs">
                          F: {recipe.nutrition.fat}g
                        </span>
                      </>
                    )}
                  </div>

                  {/* Ingredients */}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="mb-4 p-4 bg-black/20 rounded-lg">
                      <h5 className="text-sm font-semibold text-primary mb-2">Ingredienser:</h5>
                      <ul className="space-y-1">
                        {recipe.ingredients.map((ing, j) => (
                          <li
                            key={j}
                            className={`text-sm ${ing.optional ? 'text-text-muted italic' : 'text-text-secondary'}`}
                          >
                            • {ing.amount} {ing.item}
                            {ing.optional && ' (valgfritt)'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instructions */}
                  {recipe.instructions && recipe.instructions.length > 0 && (
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                      <h5 className="text-sm font-semibold text-primary mb-2">Fremgangsmåte:</h5>
                      <ol className="space-y-2">
                        {recipe.instructions.map((step, j) => (
                          <li key={j} className="text-sm text-text-secondary">
                            <span className="font-semibold text-primary">{j + 1}.</span> {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
