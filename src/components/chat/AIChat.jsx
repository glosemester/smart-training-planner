import { useState, useRef, useEffect } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { sendChatMessage, buildUserContext, STARTER_PROMPTS } from '../../services/chatService'
import { MessageCircle, Send, Sparkles, User, Bot, Loader } from 'lucide-react'

export default function AIChat() {
  const { workouts, currentPlan, getStats } = useWorkouts()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (content = input) => {
    if (!content.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: content.trim()
    }

    // Add user message to chat
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Build user context
      const stats = getStats(28)
      const userContext = buildUserContext({
        workouts,
        currentPlan,
        stats
      })

      // Send to AI
      const response = await sendChatMessage(updatedMessages, userContext)

      // Add AI response to chat
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: response.message
        }
      ])
    } catch (err) {
      setError(err.message || 'Kunne ikke sende melding')
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStarterPrompt = (prompt) => {
    setInput(prompt.text)
    handleSendMessage(prompt.text)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <MessageCircle className="text-secondary" />
          AI Treningscoach
        </h1>
        <p className="text-text-secondary mt-1">
          Chat med din personlige AI-coach om trening, mål og progresjon
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="space-y-6 py-8">
            {/* Welcome message */}
            <div className="card bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={20} className="text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-text-primary mb-2">
                    Hei! 👋 Jeg er din AI treningscoach
                  </p>
                  <p className="text-text-secondary text-sm">
                    Jeg kan hjelpe deg med treningsråd, analysere din progresjon, gi motivasjon,
                    og svare på spørsmål om løping, styrke og restitusjon.
                  </p>
                  <p className="text-text-secondary text-sm mt-2">
                    Hva kan jeg hjelpe deg med i dag?
                  </p>
                </div>
              </div>
            </div>

            {/* Starter prompts */}
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide mb-3">
                Forslag til spørsmål:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STARTER_PROMPTS.map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => handleStarterPrompt(prompt)}
                    className="btn-secondary text-left p-3 flex items-start gap-2 text-sm"
                  >
                    <span className="text-lg">{prompt.icon}</span>
                    <span className="flex-1">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-secondary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-background-secondary text-text-primary'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-primary" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-secondary" />
                </div>
                <div className="bg-background-secondary rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader size={16} className="animate-spin text-secondary" />
                    <span className="text-sm text-text-muted">Skriver...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Skriv din melding..."
          rows={1}
          className="input flex-1 resize-none"
          disabled={loading}
          style={{
            minHeight: '44px',
            maxHeight: '120px'
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || loading}
          className="btn-primary px-4 flex items-center gap-2"
          aria-label="Send melding"
        >
          {loading ? (
            <Loader size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Context indicator */}
      {workouts.length > 0 && (
        <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
          <Sparkles size={12} />
          AI-en har tilgang til dine siste {Math.min(workouts.length, 10)} treningsøkter
          {currentPlan && ' og din nåværende plan'}
        </p>
      )}
    </div>
  )
}
