import { useQuery } from '@tanstack/react-query'
import { isSupabaseProvider } from '@/lib/config'
import { fetchPartnerEarnings, fetchSettlements } from '@/services/supabase/financial'
import { useDataVersionStore } from '@/stores/dataVersionStore'
import { useSession } from '@/hooks/useDemo'

export function useFinancial() {
  const version = useDataVersionStore((state) => state.version)
  const session = useSession()
  const enabled = isSupabaseProvider() && !!session

  const earnings = useQuery({
    queryKey: ['financial-earnings', version, session?.id, session?.role],
    enabled,
    queryFn: async () => {
      if (session?.role === 'partner') return fetchPartnerEarnings(session.id)
      if (session?.role === 'admin') return fetchPartnerEarnings()
      return []
    },
  })

  const settlements = useQuery({
    queryKey: ['financial-settlements', version, session?.id, session?.role],
    enabled,
    queryFn: async () => {
      if (session?.role === 'partner') return fetchSettlements(session.id)
      if (session?.role === 'admin') return fetchSettlements()
      return []
    },
  })

  return { earnings, settlements }
}