import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../useAuth'

export const useTrainingPlans = () => {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['plans', user?.uid],
        queryFn: async () => {
            if (!user) return []

            const q = query(
                collection(db, 'users', user.uid, 'plans'),
                orderBy('weekStart', 'desc'),
                limit(100)
            )

            const snapshot = await getDocs(q)
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                weekStart: doc.data().weekStart?.toDate?.() || new Date(doc.data().weekStart)
            }))
        },
        enabled: !!user,
    })
}

// Selector hook to find the current plan
export const useCurrentPlan = () => {
    const { data: plans = [] } = useTrainingPlans()

    // Logic from TrainingContext to find current plan
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const isDateInWeek = (date, start) => {
        const s = new Date(start)
        s.setHours(0, 0, 0, 0)
        const e = new Date(s)
        e.setDate(e.getDate() + 7)
        return date >= s && date < e
    }

    // 1. Active today
    let current = plans.find(plan => isDateInWeek(today, plan.weekStart))

    // 2. Nearest future plan
    if (!current) {
        const futurePlans = plans
            .filter(plan => {
                const start = new Date(plan.weekStart)
                start.setHours(0, 0, 0, 0)
                return start > today
            })
            .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart))

        if (futurePlans.length > 0) current = futurePlans[0]
    }

    // 3. Fallback to newest
    if (!current && plans.length > 0) {
        current = plans[0]
    }

    return current || null
}
