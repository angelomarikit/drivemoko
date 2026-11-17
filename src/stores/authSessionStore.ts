import { create } from 'zustand'
import type { User } from '@/types'

/** Supabase profile mirror — updated by AuthProvider and authService after sign-in. */
export const useAuthSessionStore = create<{ user: User | null; setUser: (user: User | null) => void }>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))