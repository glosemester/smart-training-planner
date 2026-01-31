import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../useAuth'

export function useGoals() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const { data: goals = [], isLoading, error } = useQuery({
        queryKey: ['goals', user?.uid],
        queryFn: async () => {
            if (!user) return []
            const q = query(collection(db, 'goals'), where('userId', '==', user.uid))
            const snapshot = await getDocs(q)
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 60, // 1 hour (goals change rarely)
        gcTime: 1000 * 60 * 60 * 24 // 24 hours
    })

    // Mutation to add a new goal
    const addGoal = useMutation({
        mutationFn: async (goal) => {
            const docRef = await addDoc(collection(db, 'goals'), {
                userId: user.uid,
                createdAt: new Date().toISOString(),
                ...goal
            })
            return { id: docRef.id, ...goal }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['goals', user.uid])
        }
    })

    // Mutation to update a goal
    const updateGoal = useMutation({
        mutationFn: async ({ id, ...updates }) => {
            const docRef = doc(db, 'goals', id)
            await updateDoc(docRef, updates)
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['goals', user.uid])
        }
    })

    return {
        goals,
        isLoading,
        error,
        addGoal,
        updateGoal
    }
}
