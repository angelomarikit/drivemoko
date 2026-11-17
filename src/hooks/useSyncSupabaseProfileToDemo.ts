import { useEffect } from 'react'
import { isSupabaseProvider } from '@/lib/config'
import { useSession } from '@/hooks/useDemo'
import { useDemoStore } from '@/stores/demoStore'
import type { User } from '@/types'

/** Mirror Supabase profile into demoStore.users (Phase 2 bridge). No-op in mock mode. */
export function syncSessionUserToDemoStore(session: User | null) {
  if (!isSupabaseProvider() || !session) return
  const state = useDemoStore.getState()
  const index = state.users.findIndex((user) => user.id === session.id)
  if (index === -1) {
    useDemoStore.setState({
      users: [session, ...state.users],
      version: state.version + 1,
    })
    return
  }
  const current = state.users[index]
  if (
    current.role !== session.role ||
    current.name !== session.name ||
    current.email !== session.email ||
    current.status !== session.status
  ) {
    const users = [...state.users]
    users[index] = { ...current, ...session, id: session.id }
    useDemoStore.setState({ users, version: state.version + 1 })
  }
}

export function useSyncSupabaseProfileToDemo() {
  const session = useSession()
  useEffect(() => {
    syncSessionUserToDemoStore(session)
  }, [session])
}