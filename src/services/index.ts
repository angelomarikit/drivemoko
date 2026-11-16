import { demoRepository } from '@/services/mock/demoRepository'

const provider = 'mock' as 'mock' | 'supabase'

export const repositories = provider === 'mock' ? demoRepository : demoRepository
