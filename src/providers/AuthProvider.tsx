import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSupabaseAuth } from '@/lib/config'
import { getSupabaseClient } from '@/lib/supabase/client'
import { fetchProfile } from '@/services/auth/authService'
import { useAuthSessionStore } from '@/stores/authSessionStore'
import type { User } from '@/types'
import { friendlyErrorMessage } from '@/utils/friendlyError'

type AuthContextValue = {
  ready: boolean
  user: User | null
  authError: string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const enabled = useSupabaseAuth()
  const [ready, setReady] = useState(!enabled)
  const [user, setUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!enabled) return
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id
      if (!uid) {
        setUser(null)
        useAuthSessionStore.getState().setUser(null)
        return
      }
      const profile = await fetchProfile(uid)
      if (profile?.status === 'suspended') {
        await supabase.auth.signOut()
        setUser(null)
        useAuthSessionStore.getState().setUser(null)
        setAuthError('This account is suspended.')
        return
      }
      setUser(profile)
      useAuthSessionStore.getState().setUser(profile)
      setAuthError(null)
    } catch (error) {
      setUser(null)
      useAuthSessionStore.getState().setUser(null)
      setAuthError(friendlyErrorMessage(error, 'account'))
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const supabase = getSupabaseClient()
    let mounted = true

    void (async () => {
      try {
        await refreshProfile()
      } finally {
        if (mounted) setReady(true)
      }
    })()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        useAuthSessionStore.getState().setUser(null)
        return
      }
      void refreshProfile()
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [enabled, refreshProfile])

  const value = useMemo(
    () => ({ ready, user, authError, refreshProfile }),
    [ready, user, authError, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  return useContext(AuthContext)
}

/** Returns Supabase profile when auth provider is active; otherwise null context. */
export function useSupabaseSession() {
  const ctx = useAuthContext()
  if (!useSupabaseAuth()) return { ready: true, user: null as User | null, authError: null as string | null }
  if (!ctx) {
    return { ready: false, user: null, authError: 'Auth provider is not mounted.' }
  }
  return ctx
}