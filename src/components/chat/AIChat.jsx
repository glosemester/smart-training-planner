import { useState, useRef, useEffect } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { sendChatMessage, buildUserContext, STARTER_PROMPTS } from '../../services/chatService'
import { MessageCircle, Send, Sparkles, User, Bot, Loader, CheckCircle, XCircle, Image as ImageIcon, Brain } from 'lucide-react'
import ActionConfirmation from './ActionConfirmation'
import AICoachDashboard from './AICoachDashboard'

export default function AIChat() {
  const { workouts, currentPlan, plans, getStats, updatePlanSession, addPlanSession, deletePlanSession, updatePlan, mentalState } = useWorkouts()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingActions, setPendingActions] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showBrain, setShowBrain] = useState(false) // Toggle for AI Dashboard
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Bildet er for stort. Maks 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async (content = input) => {
    if ((!content.trim() && !selectedImage) || loading) return

    const userMessage = {
      role: 'user',
      content: content.trim(),
      image: selectedImage
    }

    // Add user message to chat
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setSelectedImage(null)
    setLoading(true)
    setError(null)

    try {
      // Build user context
      const stats = getStats(28)
      const userContext = buildUserContext({
        workouts,
        currentPlan,
        plans,
        stats,
        mentalState // Pass mental state to chat context
      })

      // Send to AI
      const response = await sendChatMessage(updatedMessages, userContext)

      // Validate response
      if (!response || !response.message) {
        throw new Error('AI-en ga et ugyldig svar. Vennligst prøv igjen.')
      }

      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: response.message
      }
      setMessages([...updatedMessages, aiMessage])

      // Check if AI wants to perform actions
      if (response.actions && response.actions.length > 0) {
        setPendingActions({
          message: response.message,
          actions: response.actions
        })
      }
    } catch (err) {
      console.error('Chat error:', err)

      // Provide user-friendly error messages
      let errorMessage = 'Kunne ikke sende melding. '

      const errString = err.toString().toLowerCase()
      if (errString.includes('timeout') || errString.includes('deadline')) {
        errorMessage += 'AI-tenkepausen ble for lang (timeout). Prøv med litt kortere melding.'
      } else if (errString.includes('network') || errString.includes('fetch')) {
        errorMessage += 'Sjekk internettforbindelsen din.'
      } else if (errString.includes('json') || errString.includes('parse')) {
        errorMessage += 'AI-svaret var litt uleselig. Prøve å spørre på en annen måte?' // Mykere feilmelding
      } else if (errString.includes('internal')) {
        errorMessage += 'Teknisk feil i skyen. Vi jobber med saken.'
      } else {
        errorMessage += err.message || 'Ukjent feil oppstod.'
      }

      setError(errorMessage)
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

  const handleConfirmActions = async (actions) => {
    if (!currentPlan) {
      setError('Ingen aktiv plan å endre')
      setPendingActions(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      for (const action of actions) {
        const { function: funcName, arguments: args } = action

        switch (funcName) {
          case 'update_session':
            await updatePlanSession(currentPlan.id, args.sessionId, args.changes)
            break

          case 'move_session':
            await updatePlanSession(currentPlan.id, args.sessionId, { day: args.newDay })
            break

          case 'add_session':
            await addPlanSession(currentPlan.id, {
              day: args.day,
              type: args.type,
              title: args.title,
              description: args.description,
              duration_minutes: args.duration_minutes,
              details: args.distance_km ? { distance_km: args.distance_km } : {}
            })
            break

          case 'delete_session':
            await deletePlanSession(currentPlan.id, args.sessionId)
            break

          case 'adjust_plan_load':
            // This would require more complex logic to recalculate all sessions
            // For now, we'll just add a message
            console.log('Adjust plan load:', args)
            break

          default:
            console.warn('Unknown action:', funcName)
        }
      }

      // Add success message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '✅ Endringene er gjennomført! Sjekk planen din for å se oppdateringene.'
        }
      ])
    } catch (err) {
      setError('Kunne ikke utføre endringene: ' + err.message)
    } finally {
      setPendingActions(null)
      setLoading(false)
    }
  }

  const handleCancelActions = () => {
    setPendingActions(null)
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: 'Ok, jeg har kansellert endringene. Er det noe annet jeg kan hjelpe deg med?'
      }
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
            <MessageCircle className="text-secondary" />
            AI Treningscoach
          </h1>
          <p className="text-text-secondary mt-1">
            Chat med din personlige AI-coach om trening, mål og progresjon
          </p>
        </div>

        {/* Brain Toggle */}
        <button
          onClick={() => setShowBrain(!showBrain)}
          className={`p-2 rounded-xl transition-all ${showBrain ? 'bg-secondary text-black shadow-lg shadow-secondary/20' : 'bg-background-secondary text-text-secondary hover:text-white'}`}
          title="Show Mental State"
        >
          <Brain size={24} />
        </button>
      </div>

      {/* Mental State Dashboard (Collapsible) */}
      {showBrain && (
        <AICoachDashboard mentalState={mentalState} />
      )}

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
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-secondary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-background-secondary text-text-primary'
                    }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Opplastet bilde"
                      className="max-w-full rounded-lg mb-2 border border-white/10"
                      style={{ maxHeight: '200px' }}
                    />
                  )}
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
      <div className="flex flex-col gap-2">
        {selectedImage && (
          <div className="relative inline-block self-start ml-2 p-1 border border-white/10 rounded-lg bg-black/20">
            <img
              src={selectedImage}
              alt="Valgt bilde"
              className="h-20 rounded shadow-md"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary px-3 mb-1 h-11 flex items-center justify-center"
            title="Last opp bilde"
          >
            <ImageIcon size={20} />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Skriv din melding..."
            rows={1}
            className="input flex-1 resize-none py-3"
            disabled={loading}
            style={{
              minHeight: '44px',
              maxHeight: '120px'
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={(!input.trim() && !selectedImage) || loading}
            className="btn-primary px-4 mb-1 h-11 flex items-center justify-center"
            aria-label="Send melding"
          >
            {loading ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Context indicator */}
      {workouts.length > 0 && (
        <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
          <Sparkles size={12} />
          AI-en har tilgang til dine siste {Math.min(workouts.length, 50)} treningsøkter
          {currentPlan && ' og din nåværende plan'}
        </p>
      )}

      {/* Action Confirmation Modal */}
      {pendingActions && (
        <ActionConfirmation
          actions={pendingActions.actions}
          message={pendingActions.message}
          currentPlan={currentPlan}
          onConfirm={handleConfirmActions}
          onCancel={handleCancelActions}
        />
      )}
    </div>
  )
}
