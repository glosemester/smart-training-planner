import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, Calculator, Apple, ChevronDown } from 'lucide-react'

/**
 * ToolsDropdown - Dropdown menu for tools (Calculator, Nutrition, etc.)
 */
export default function ToolsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const tools = [
    {
      to: '/calculator',
      icon: Calculator,
      label: 'Løpskalkulator',
      description: 'Race predictor & VO2max'
    },
    {
      to: '/nutrition',
      icon: Apple,
      label: 'Matplanlegger',
      description: 'AI matplan & oppskrifter'
    }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-white/5 text-text-muted hover:text-primary'
        }`}
        title="Verktøy"
      >
        <div className="flex items-center gap-1">
          <Wrench size={18} />
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 sm:w-72 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50 max-h-[calc(100vh-8rem)] overflow-y-auto"
          >
            <div className="py-2">
              {tools.map((tool) => {
                const Icon = tool.icon
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 px-4 py-4 hover:bg-white/5 active:bg-white/10 transition-colors group min-h-[60px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text-primary text-sm group-hover:text-primary transition-colors">
                        {tool.label}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {tool.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Optional: Add more tools hint */}
            <div className="border-t border-white/5 px-4 py-2 bg-white/5">
              <p className="text-xs text-text-muted text-center">
                Flere verktøy kommer snart
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
