export type DataProvider = 'mock' | 'supabase'

export function getDataProvider(): DataProvider {
  const value = import.meta.env.VITE_DATA_PROVIDER?.trim().toLowerCase()
  if (value === 'mock') return 'mock'
  if (value === 'supabase') return 'supabase'
  return supabaseConfigured() ? 'supabase' : 'mock'
}

export function isSupabaseProvider() {
  return getDataProvider() === 'supabase'
}

export function isMockProvider() {
  return !isSupabaseProvider()
}

export function supabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return Boolean(url && key)
}

export function useSupabaseAuth() {
  return isSupabaseProvider() && supabaseConfigured()
}