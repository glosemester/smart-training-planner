import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Calendar, Clock } from 'lucide-react'

export default function DateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="card bg-background-secondary">
      <div className="flex items-center justify-between">
        {/* Date */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-heading font-bold text-lg text-text-primary">
              {format(currentTime, 'EEEE d. MMMM', { locale: nb })}
            </p>
            <p className="text-xs text-text-muted">
              {format(currentTime, 'yyyy', { locale: nb })}
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <div>
            <p className="font-heading font-bold text-2xl text-text-primary text-right tabular-nums">
              {format(currentTime, 'HH:mm')}
            </p>
            <p className="text-xs text-text-muted text-right">
              {format(currentTime, 'ss')} sek
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Clock size={20} className="text-secondary" />
          </div>
        </div>
      </div>
    </div>
  )
}
