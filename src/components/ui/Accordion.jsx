import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { collapse } from '../../utils/animations'

export function Accordion({
  title,
  children,
  defaultOpen = false,
  icon: Icon,
  badge,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} className="text-primary" />}
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-text-secondary" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={collapse}
          >
            <div className="px-6 pb-6 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Accordion
