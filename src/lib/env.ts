import { isSupabaseProvider, supabaseConfigured } from '@/lib/config'

/** Client-safe environment checks (no secrets). */
export function validateClientEnv() {
  if (import.meta.env.PROD && isSupabaseProvider() && !supabaseConfigured()) {
    console.error('Production build is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  }
  const forbidden = ['VITE_SUPABASE_SERVICE_ROLE', 'VITE_SMS_API_KEY', 'VITE_SMTP_PASSWORD']
  for (const key of forbidden) {
    if ((import.meta.env as Record<string, string | undefined>)[key]) {
      console.error(`Remove ${key} from client env — privileged secrets must not use VITE_ prefix.`)
    }
  }
}