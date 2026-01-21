/**
 * Generate AI daily summary
 * @param {Object} data - Data for summary generation
 * @returns {Promise<Object>} Summary result
 */
export async function generateDailySummary(data) {
  try {
    const response = await fetch('/.netlify/functions/generate-daily-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Summary service error:', error)
    throw new Error(error.message || 'Kunne ikke generere daglig oppsummering')
  }
}

export default {
  generateDailySummary
}
