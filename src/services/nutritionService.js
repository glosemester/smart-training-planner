/**
 * Nutrition Service for AI-powered meal analysis
 * Uses OpenAI GPT-4o mini via Netlify function
 */

/**
 * Analyze meal description and get nutritional information
 * @param {string} description - Description of the meal
 * @param {string} mealType - Optional meal type hint (breakfast, lunch, dinner, snack)
 * @returns {Promise<Object>} Nutrition analysis with calories and macros
 */
export async function analyzeMeal(description, mealType = null) {
  try {
    // Validate description
    if (!description || !description.trim()) {
      throw new Error('Beskrivelse av måltid er påkrevd')
    }

    // Call Netlify function
    const response = await fetch('/.netlify/functions/analyze-nutrition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: description.trim(),
        mealType
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error ${response.status}`)
    }

    const result = await response.json()

    // Check if meal was detected
    if (!result.detected) {
      throw new Error(result.message || 'Kunne ikke analysere måltidet')
    }

    return result
  } catch (error) {
    console.error('Nutrition analysis failed:', error)
    throw error
  }
}

/**
 * Calculate total nutrition for multiple meals
 * @param {Array} meals - Array of meal objects with totals
 * @returns {Object} Total nutrition for the day
 */
export function calculateDailyTotals(meals) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealCount: meals.length
  }

  meals.forEach(meal => {
    if (meal.nutrition?.totals) {
      totals.calories += meal.nutrition.totals.calories || 0
      totals.protein += meal.nutrition.totals.protein || 0
      totals.carbs += meal.nutrition.totals.carbs || 0
      totals.fat += meal.nutrition.totals.fat || 0
    }
  })

  // Round to 1 decimal
  totals.protein = Math.round(totals.protein * 10) / 10
  totals.carbs = Math.round(totals.carbs * 10) / 10
  totals.fat = Math.round(totals.fat * 10) / 10

  return totals
}

/**
 * Get macro percentages
 * @param {number} protein - Protein in grams
 * @param {number} carbs - Carbs in grams
 * @param {number} fat - Fat in grams
 * @returns {Object} Percentage of calories from each macro
 */
export function getMacroPercentages(protein, carbs, fat) {
  const proteinCals = protein * 4
  const carbsCals = carbs * 4
  const fatCals = fat * 9
  const totalCals = proteinCals + carbsCals + fatCals

  if (totalCals === 0) return { protein: 0, carbs: 0, fat: 0 }

  return {
    protein: Math.round((proteinCals / totalCals) * 100),
    carbs: Math.round((carbsCals / totalCals) * 100),
    fat: Math.round((fatCals / totalCals) * 100)
  }
}

/**
 * Meal type labels in Norwegian
 */
export const MEAL_TYPE_LABELS = {
  breakfast: 'Frokost',
  lunch: 'Lunsj',
  dinner: 'Middag',
  snack: 'Snacks'
}

/**
 * Meal type icons
 */
export const MEAL_TYPE_ICONS = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎'
}

/**
 * Get recommended daily intake based on user profile
 * @param {Object} userProfile - User profile with activity level, weight, etc.
 * @returns {Object} Recommended daily nutrition
 */
export function getRecommendedIntake(userProfile = {}) {
  // Default recommendations for active person
  // This can be customized based on user's actual profile
  return {
    calories: 2500,
    protein: 150, // 1.5-2g per kg bodyweight for athletes
    carbs: 300,
    fat: 80
  }
}
