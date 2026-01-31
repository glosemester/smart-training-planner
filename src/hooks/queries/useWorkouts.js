import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../useAuth'

export const useWorkouts = () => {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['workouts', user?.uid],
        queryFn: async () => {
            if (!user) return []

            const q = query(
                collection(db, 'users', user.uid, 'workouts'),
                orderBy('date', 'desc'),
                limit(100)
            )

            const snapshot = await getDocs(q)
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate?.() || new Date(doc.data().date)
            }))
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    })
}
