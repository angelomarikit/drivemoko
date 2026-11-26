type ErrorContext = 'booking' | 'vehicle' | 'payment' | 'account' | 'general'

const FRIENDLY_ALREADY = [
  'those dates overlap',
  'those dates are no longer',
  'you already have pending',
  'signed in as staff',
  'please upload',
  'choose a password',
  'at least 8 characters',
  'this email already',
  'vehicle not found',
  'sign in',
  'could not save',
  'could not verify',
  'not available',
  'accept the rental',
  'enter your',
  'choose a',
  'pick a',
  'make sure you',
  'refresh the page',
  'this vehicle could not',
  'open it from available cars',
  'something went wrong',
  'session expired',
  'sign in again',
  'only an administrator',
  'session is out of date',
  'vehicle not found or it could not be removed',
]

function looksCustomerReady(message: string) {
  const lower = message.toLowerCase()
  if (/[a-f0-9]{8}-[a-f0-9-]{27,}/i.test(message)) return false
  if (lower.includes('::') || lower.includes('pgrst') || lower.includes('jwt')) return false
  return FRIENDLY_ALREADY.some((phrase) => lower.includes(phrase))
}

export function friendlyErrorMessage(error: unknown, context: ErrorContext = 'general'): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Something went wrong. Please try again.'
  if (!raw.trim()) return 'Something went wrong. Please try again.'
  if (looksCustomerReady(raw)) return raw.trim()

  const lower = raw.toLowerCase()

  if (
    lower.includes('bookings_no_overlap') ||
    lower.includes('23p01') ||
    lower.includes('exclusion constraint') ||
    (lower.includes('conflicting key') && lower.includes('exclusion'))
  ) {
    return 'Those dates are no longer available for this vehicle. Pick different dates and try again.'
  }

  if (lower.includes('row-level security') || lower.includes('permission denied') || lower.includes('not allowed')) {
    if (context === 'vehicle') {
      return 'We could not remove or update this vehicle. Please sign out, sign in with your admin account, and try again.'
    }
    if (context === 'booking') {
      if (lower.includes('storage') || lower.includes('bucket')) {
        return 'We could not upload your verification files. Sign in with your customer account and try again, or contact us for help.'
      }
      return 'This account cannot finish an online booking. Sign out, book as a customer (or use guest checkout), or contact Drive Moko for help.'
    }
    if (context === 'payment') {
      return 'We could not record this payment. Please try again or ask an administrator for help.'
    }
    return 'You do not have permission to do that. Please sign in with the correct account or contact us.'
  }

  if (lower.includes('invalid input syntax for type uuid')) {
    return 'Something on this page is out of date. Refresh the page, then try again from Available Cars.'
  }

  if (lower.includes('bookings_no_overlap') || lower.includes('23p01') || lower.includes('overlap')) {
    return 'Those dates are no longer available for this vehicle. Pick different dates and try again.'
  }

  if (lower.includes('already registered') || (lower.includes('email') && lower.includes('already'))) {
    if (context === 'account' || context === 'booking') {
      return 'This email already has an account. Sign in from the menu, then confirm your booking again.'
    }
  }

  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    if (context === 'account') {
      return 'This email is already registered. Sign in or use a different email.'
    }
    if (context === 'booking') {
      if (lower.includes('bookings_no_overlap') || lower.includes('exclusion')) {
        return 'Those dates are no longer available for this vehicle. Pick different dates and try again.'
      }
      if (lower.includes('storage') || lower.includes('object') || lower.includes('resource')) {
        return 'We could not complete your booking right now. Please try again in a moment or message us for help.'
      }
      return 'Those dates are no longer available for this vehicle. Pick different dates and try again.'
    }
    return 'This record already exists. Refresh the page and check your list.'
  }

  if (lower.includes('jwt') || lower.includes('session') || lower.includes('refresh token')) {
    return 'Your session expired. Please sign in again.'
  }

  if (
    lower.includes('admin_finalize_partner_profile') ||
    lower.includes('partner finalize is not installed') ||
    lower.includes('pgrst202')
  ) {
    return 'Partner setup is missing in the database. An admin must run SQL migration 039_ensure_partner_finalize_rpc.sql in Supabase, then try Finalize again.'
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'We could not reach the server. Check your connection and try again.'
  }

  if (lower.includes('file type') || lower.includes('too large')) {
    return raw.trim()
  }

  if (context === 'booking') {
    return 'We could not complete your booking right now. Please try again in a moment or message us for help.'
  }
  if (context === 'vehicle') {
    return 'We could not update the vehicle list right now. Please try again or contact support.'
  }

  return 'Something went wrong on our side. Please try again, or contact Drive Moko if it keeps happening.'
}