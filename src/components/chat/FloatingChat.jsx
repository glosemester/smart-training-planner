import { useState, useRef, useEffect } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useTraining } from '../../contexts/TrainingContext' // Correct import
import { sendChatMessage, buildUserContext, STARTER_PROMPTS } from '../../services/chatService'
import { MessageCircle, Send, Sparkles, User, Bot, Loader, XCircle, Image as ImageIcon, ChevronDown, Minimize2, Trash2 } from 'lucide-react'
import ActionConfirmation from './ActionConfirmation'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../config/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function FloatingChat() {
    // Combine hooks: useTraining provides both workouts/plans AND the UI state now
    const {
        workouts, currentPlan, plans, getStats,
        updatePlanSession, addPlanSession, deletePlanSession,
        isChatOpen, setChatOpen, chatInitialMessage, setChatInitialMessage
    } = useTraining()

    const { user } = useAuth()

    // const [isOpen, setIsOpen] = useState(false) // Removed local state
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [error, setError] = useState(null)
    const [pendingActions, setPendingActions] = useState(null)
    const [selectedImage, setSelectedImage] = useState(null)
    const fileInputRef = useRef(null)
    const messagesEndRef = useRef(null)

    // Load chat history from Firestore when chat opens
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!user || !isChatOpen) return

            setLoadingHistory(true)
            try {
                const chatRef = doc(db, 'users', user.uid, 'chatSessions', 'current')
                const chatDoc = await getDoc(chatRef)

                if (chatDoc.exists() && chatDoc.data().messages) {
                    setMessages(chatDoc.data().messages)
                }
            } catch (err) {
                console.error('Failed to load chat history:', err)
            } finally {
                setLoadingHistory(false)
            }
        }

        loadChatHistory()
    }, [user, isChatOpen])

    // Handle initial message from Context (e.g., triggered by Widget)
    useEffect(() => {
        if (isChatOpen && chatInitialMessage) {
            handleSendMessage(chatInitialMessage)
            setChatInitialMessage(null) // Clear it
        }
    }, [isChatOpen, chatInitialMessage])

    // Auto-scroll to bottom
    useEffect(() => {
        if (isChatOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isChatOpen])

    // Initial plan: keep handleImageSelect but I removed it. Re-adding.
    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setSelectedImage(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSendMessage = async (content = input) => {
        if ((!content.trim() && !selectedImage) || loading || !user) return

        const userMessage = {
            role: 'user',
            content: content.trim(),
            image: selectedImage
        }

        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput('')
        setSelectedImage(null)
        setLoading(true)
        setError(null)

        try {
            const stats = getStats(28)
            // Fix: ensure correct context building
            const userContext = buildUserContext({ workouts, currentPlan, plans, stats })
            const response = await sendChatMessage(updatedMessages, userContext)

            if (!response || !response.message) throw new Error('Ugyldig svar fra AI.')

            const aiMessage = { role: 'assistant', content: response.message }
            const finalMessages = [...updatedMessages, aiMessage]
            setMessages(finalMessages)

            // Persist to Firestore (without images to save space)
            await saveChatHistory(finalMessages)

            if (response.actions?.length > 0) {
                setPendingActions({ message: response.message, actions: response.actions })
            }
        } catch (err) {
            console.error('Chat error:', err)
            setError('Kunne ikke sende melding. Prøv igjen.')
        } finally {
            setLoading(false)
        }
    }

    const saveChatHistory = async (messagesToSave) => {
        if (!user) return

        try {
            const chatRef = doc(db, 'users', user.uid, 'chatSessions', 'current')
            // Strip images from messages to save space (keep last 50 messages)
            const messagesToStore = messagesToSave.slice(-50).map(msg => ({
                role: msg.role,
                content: msg.content
                // Omit image data
            }))

            await setDoc(chatRef, {
                messages: messagesToStore,
                updatedAt: serverTimestamp()
            })
        } catch (err) {
            console.error('Failed to save chat history:', err)
        }
    }

    const clearChatHistory = async () => {
        if (!user) return

        try {
            setMessages([])
            const chatRef = doc(db, 'users', user.uid, 'chatSessions', 'current')
            await setDoc(chatRef, {
                messages: [],
                updatedAt: serverTimestamp()
            })
        } catch (err) {
            console.error('Failed to clear chat history:', err)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleConfirmActions = async (actions) => {
        try {
            for (const action of actions) {
                if (action.type === 'update_session' && action.sessionId) {
                    await updatePlanSession(currentPlan.id, action.sessionId, action.updates)
                } else if (action.type === 'add_session' && action.session) {
                    await addPlanSession(currentPlan.id, action.session)
                } else if (action.type === 'delete_session' && action.sessionId) {
                    await deletePlanSession(currentPlan.id, action.sessionId)
                } else if (action.type === 'move_session' && action.sessionId && action.newDay) {
                    // Move session to new day
                    await updatePlanSession(currentPlan.id, action.sessionId, { day: action.newDay })
                } else if (action.type === 'adjust_plan_load' && action.adjustment && action.percentage) {
                    // Adjust all sessions in the plan by percentage
                    const factor = action.adjustment === 'increase' ? (1 + action.percentage / 100) : (1 - action.percentage / 100)
                    for (const session of currentPlan.sessions) {
                        if (session.type !== 'rest') {
                            const updates = {
                                duration_minutes: Math.round(session.duration_minutes * factor)
                            }
                            if (session.details?.distance_km) {
                                updates.details = {
                                    ...session.details,
                                    distance_km: Math.round(session.details.distance_km * factor * 10) / 10
                                }
                            }
                            await updatePlanSession(currentPlan.id, session.id, updates)
                        }
                    }
                }
            }
            setPendingActions(null)
            setMessages(prev => [...prev, { role: 'assistant', content: '✅ Endringene er utført!' }])
        } catch (err) {
            console.error('Action error:', err)
            setError('Kunne ikke utføre endringene.')
        }
    }

    return (
        <>
            {/* Floating Toggle Button */}
            {!isChatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-24 right-4 z-[60] w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-lime-400 text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 hover:shadow-primary/50 active:scale-95 transition-all duration-300"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <Bot size={26} />
                    {messages.length === 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-white shadow-lg"></span>
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window Overlay */}
            {isChatOpen && (
                <div
                    className="fixed inset-0 lg:inset-auto lg:bottom-24 lg:right-8 lg:w-[420px] lg:h-[650px] bg-background/95 backdrop-blur-2xl lg:rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-[70] flex flex-col overflow-hidden border border-white/10 animate-fade-in-up"
                    style={{ paddingTop: 'env(safe-area-inset-top)' }}
                >
                    {/* Header */}
                    <div className="px-6 py-5 flex items-center justify-between text-white border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                <Bot size={22} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">AI Coach</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChatHistory}
                                    className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-colors text-text-secondary hover:text-error"
                                    title="Tøm chat"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <button
                                onClick={() => setChatOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-colors text-text-secondary hover:text-white"
                            >
                                <Minimize2 size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader size={24} className="animate-spin text-primary" />
                                <span className="ml-3 text-sm text-text-secondary">Laster samtale...</span>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="space-y-6 py-4">
                                <div className="bg-white/5 border border-white/5 rounded-3xl p-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Sparkles size={40} className="text-primary" />
                                    </div>
                                    <p className="text-sm text-text-primary leading-relaxed relative z-10">
                                        Hei! Jeg er din personlige coach. Jeg kjenner dine mål og din treningshistorikk. Hvordan kan jeg hjelpe deg i dag?
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold px-1">Forslag</p>
                                    {STARTER_PROMPTS.slice(0, 3).map(prompt => (
                                        <button
                                            key={prompt.id}
                                            onClick={() => { setInput(prompt.text); handleSendMessage(prompt.text); }}
                                            className="text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs transition-all hover:scale-[1.02] active:scale-[0.98] group flex items-center gap-3"
                                        >
                                            <span className="text-lg group-hover:scale-110 transition-transform">{prompt.icon}</span>
                                            <span className="text-text-secondary group-hover:text-white transition-colors">{prompt.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 shadow-inner">
                                            <Bot size={16} className="text-primary" />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                                        : 'bg-white/5 border border-white/10 text-text-primary rounded-tl-none'
                                        }`}>
                                        {msg.image && (
                                            <img src={msg.image} className="rounded-xl mb-3 max-h-48 w-full object-cover border border-white/10" alt="Uploaded" />
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                                    <Bot size={16} className="text-primary" />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] rounded-tl-none px-4 py-3 flex items-center gap-3">
                                    <Loader size={16} className="animate-spin text-primary" />
                                    <span className="text-xs text-text-secondary font-medium tracking-tight">Tenker...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 border-t border-white/5 bg-transparent backdrop-blur-md">
                        {error && (
                            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl text-[11px] text-error flex items-center gap-2">
                                <XCircle size={14} />
                                {error}
                            </div>
                        )}
                        {selectedImage && (
                            <div className="relative inline-block mb-4 group">
                                <img src={selectedImage} className="h-20 w-20 object-cover rounded-2xl border-2 border-primary/50 shadow-lg" alt="Preview" />
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1.5 shadow-xl hover:scale-110 transition-transform"
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3 items-end bg-white/5 border border-white/10 rounded-[1.5rem] p-2 focus-within:border-primary/50 transition-all duration-300">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-text-muted hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                title="Bilde"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Spør meg om hva som helst..."
                                rows={1}
                                className="flex-1 bg-transparent border-none rounded-none px-1 py-2.5 text-sm focus:outline-none focus:ring-0 placeholder:text-text-muted resize-none scrollbar-hide"
                                style={{ maxHeight: '120px' }}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={(!input.trim() && !selectedImage) || loading}
                                className="p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 disabled:grayscale hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Modals */}
            {pendingActions && (
                <div className="z-[80] relative">
                    <ActionConfirmation
                        actions={pendingActions.actions}
                        message={pendingActions.message}
                        currentPlan={currentPlan}
                        onConfirm={handleConfirmActions}
                        onCancel={() => setPendingActions(null)}
                    />
                </div>
            )}
        </>
    )
}
