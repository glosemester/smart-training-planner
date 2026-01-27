import { functions } from '../config/firebase'
import { httpsCallable } from 'firebase/functions'

const CACHE_KEY_PREFIX = 'daily_summary_'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

/**
 * Generate AI daily summary
 * Uses localStorage caching to prevent quota overuse
 * @param {Object} data - Data for summary generation
 * @returns {Promise<Object>} Summary result
 */
export async function generateDailySummary(data) {
  try {
    // Generate cache key based on today's date
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `${CACHE_KEY_PREFIX}${today}`

    // Check cache
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const { timestamp, data: cachedData } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('Using cached daily summary')
        return cachedData
      }
    }

    const generateSummaryFn = httpsCallable(functions, 'generateDailySummary')
    const result = await generateSummaryFn({ data })
    const summaryData = result.data

    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: summaryData
    }))

    return summaryData
  } catch (error) {
    console.error('Summary service error:', error)
    throw new Error(error.message || 'Kunne ikke generere daglig oppsummering')
  }
}

export default {
  generateDailySummary
}
