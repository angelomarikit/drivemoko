import { getSupabaseClient } from '@/lib/supabase/client'
import { isSupabaseProvider, supabaseConfigured } from '@/lib/config'

import { authRedirectPath } from '@/utils/authRedirect'

/**
 * Sends a Supabase Auth email (project SMTP / Supabase mailer) — no Resend edge function.
 * Prefer magic-link sign-in; fall back to signup confirmation resend when applicable.
 */
export async function sendGuestBookingSupabaseEmail(
  email: string,
  reference: string,
): Promise<boolean> {
  if (!isSupabaseProvider() || !supabaseConfigured()) return false
  const supabase = getSupabaseClient()
  const normalized = email.trim().toLowerCase()
  const next = encodeURIComponent('/customer/bookings')
  const emailRedirectTo = authRedirectPath(`/auth/callback?next=${next}`)

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  })
  if (!otpError) return true

  const { error: resendError } = await supabase.auth.resend({
    type: 'signup',
    email: normalized,
    options: { emailRedirectTo },
  })
  if (!resendError) return true

  console.warn('Guest booking Supabase email:', otpError.message, resendError.message, reference)
  return false
}