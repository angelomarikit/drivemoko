import { useEffect, useState } from 'react'
import { isSupabaseProvider } from '@/lib/config'
import { useSupabaseSession } from '@/providers/AuthProvider'
import { useDemoStore } from '@/stores/demoStore'

export function useHydrated() {
  const [hydrated, setHydrated] = useState(useDemoStore.persist.hasHydrated())
  useEffect(() => {
    if (useDemoStore.persist.hasHydrated()) setHydrated(true)
    return useDemoStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])
  return hydrated
}

/** Mock: Zustand persist. Supabase: auth session restored. */
export function useAppReady() {
  const mockHydrated = useHydrated()
  const { ready: authReady } = useSupabaseSession()
  if (isSupabaseProvider()) return authReady
  return mockHydrated
}