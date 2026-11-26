import { useLayoutEffect } from 'react'
import { useSupabaseAuth } from '@/lib/config'
import { redirectAuthHashIfNeeded } from '@/utils/authRedirect'

/**
 * Runs before paint so Supabase `detectSessionInUrl` still sees the hash on the correct route.
 */
export function useAuthRecoveryHashRedirect() {
  const enabled = useSupabaseAuth()

  useLayoutEffect(() => {
    if (!enabled) return
    redirectAuthHashIfNeeded()
  }, [enabled])
}