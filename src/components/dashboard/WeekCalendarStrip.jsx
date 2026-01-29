import { useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { nb } from 'date-fns/locale'

export default function WeekCalendarStrip() {
    const dates = useMemo(() => {
        const today = new Date()
        const start = startOfWeek(today, { weekStartsOn: 1 })
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i))
    }, [])

    const today = new Date()

    return (
        <div className="flex justify-between items-center px-1 mb-6">
            {dates.map((date) => {
                const isToday = isSameDay(date, today)
                return (
                    <div
                        key={date.toISOString()}
                        className={`flex flex-col items-center justify-center w-10 h-14 rounded-full transition-all duration-300 ${isToday
                                ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-110'
                                : 'bg-transparent text-text-secondary hover:bg-white/5'
                            }`}
                    >
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                            {format(date, 'EEEEE', { locale: nb })}
                        </span>
                        <span className={`text-sm font-bold ${isToday ? 'text-black' : 'text-white'}`}>
                            {format(date, 'd')}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
