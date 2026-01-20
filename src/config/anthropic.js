// Anthropic API Configuration
// OPPDATERT: API-kallet gjøres nå via Netlify Functions for å beskytte API-nøkkelen.
// Denne filen beholdes for fremtidig konfigurasjon og referanse.

// VIKTIG: API-nøkkelen skal nå settes som en environment variable i Netlify Dashboard
// (uten VITE_ prefix), ikke i klient-koden.

export const anthropicConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 2000
}

export default anthropicConfig
