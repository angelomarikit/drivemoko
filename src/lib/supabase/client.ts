import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfigured } from '@/lib/config'

let client: SupabaseClient | null = null

export function getSupabaseClient() {
  if (!supabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
  }
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    )
  }
  return client
}