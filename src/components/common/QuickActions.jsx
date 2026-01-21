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
      <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-2">
        {/* Quick action buttons */}
        {isOpen && actions.map((action, index) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.to)}
            className={`
              ${action.color} text-white
              rounded-2xl pl-4 pr-5 py-2.5 shadow-lg
              flex items-center gap-2.5
              transform transition-all duration-200
              hover:scale-105 hover:shadow-xl
              active:scale-95
              animate-slide-in-right
            `}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            <action.icon size={18} strokeWidth={2.5} />
            <span className="font-semibold text-sm whitespace-nowrap">{action.label}</span>
          </button>
        ))}

        {/* Main toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full
            bg-gradient-to-br from-primary to-primary-dark
            shadow-lg shadow-primary/40
            flex items-center justify-center
            transition-all duration-200
            hover:scale-105 hover:shadow-xl hover:shadow-primary/50
            active:scale-95
            ${isOpen ? 'rotate-45' : ''}
          `}
        >
          <Plus size={26} strokeWidth={2.5} className="text-white" />
        </button>
      </div>
    </>
  )
}
