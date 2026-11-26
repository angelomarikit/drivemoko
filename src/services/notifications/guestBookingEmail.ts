import { getSupabaseClient } from '@/lib/supabase/client'
import { isSupabaseProvider, supabaseConfigured } from '@/lib/config'

export type GuestBookingLoginEmailInput = {
  email: string
  password: string
  reference: string
  bookingId: string
  customerId: string
  loginUrl: string
}

export async function sendGuestBookingLoginEmail(input: GuestBookingLoginEmailInput): Promise<boolean> {
  if (!isSupabaseProvider() || !supabaseConfigured()) return false
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('send-guest-booking-login-email', {
    body: input,
  })
  if (error) {
    console.warn('send-guest-booking-login-email:', error.message)
    return false
  }
  const payload = data as { ok?: boolean; skipped?: boolean } | null
  return Boolean(payload?.ok && !payload?.skipped)
}