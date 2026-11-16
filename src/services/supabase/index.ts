import type { DemoRepository } from '@/services/repositories/types'

export function createSupabaseRepositories(): DemoRepository {
  throw new Error('Supabase is not connected. This build stays on the demo data provider.')
}
