import { isSupabaseProvider } from '@/lib/config'
import { demoRepository, maintenanceRepository as demoMaintenance, sessionRepository } from '@/services/mock/demoRepository'
import { supabaseRepository, createInquiry, toggleFavorite } from '@/services/supabase/repository'
import { addMaintenance, removeMaintenance } from '@/services/supabase/maintenance'

export const dataProvider = isSupabaseProvider() ? 'supabase' : 'mock'

export const repositories = isSupabaseProvider() ? supabaseRepository : demoRepository

export const maintenanceRepository = isSupabaseProvider()
  ? { add: addMaintenance, remove: removeMaintenance }
  : demoMaintenance

export { sessionRepository, createInquiry, toggleFavorite }