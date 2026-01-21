import { useState } from 'react'
import { Plus, Calendar, Apple, Dumbbell, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const actions = [
    {
      icon: Dumbbell,
      label: 'Logg økt',
      to: '/workouts/new',
      color: 'bg-primary'
    },
    {
      icon: Apple,
      label: 'Logg måltid',
      to: '/nutrition',
      color: 'bg-success'
    },
    {
      icon: Calendar,
      label: 'Se kalender',
      to: '/calendar',
      color: 'bg-secondary'
    }
  ]

  const handleAction = (to) => {
    navigate(to)
    setIsOpen(false)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[45] animate-fade-in-up"
        />
      )}

      {/* Action buttons */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Quick action buttons */}
        {isOpen && actions.map((action, index) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.to)}
            className={`
              ${action.color} text-white
              rounded-full px-5 py-3 shadow-lg
              flex items-center gap-2
              transform transition-all duration-300
              hover:scale-110 hover:shadow-xl
              animate-bounce-in
            `}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            <action.icon size={20} />
            <span className="font-medium text-sm">{action.label}</span>
          </button>
        ))}

        {/* Main toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full
            bg-gradient-to-br from-primary to-primary-dark
            shadow-lg shadow-primary/50
            flex items-center justify-center
            transition-all duration-300
            hover:scale-110 hover:shadow-xl hover:shadow-primary/60
            active:scale-95
            ${isOpen ? 'rotate-45' : ''}
          `}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </button>
      </div>
    </>
  )
}
