import { getSupabaseClient } from '@/lib/supabase/client'
import { fetchProfile } from '@/services/auth/authService'
import { useAuthSessionStore } from '@/stores/authSessionStore'
import type { CustomerDraft } from '@/types'

async function syncCustomerProfile(customerId: string, customer: CustomerDraft) {
  const supabase = getSupabaseClient()
  await supabase
    .from('profiles')
    .update({
      full_name: customer.name,
      phone: customer.phone,
      address: customer.address,
      license_number: customer.licenseNumber || null,
      emergency_name: customer.emergencyName || null,
      emergency_phone: customer.emergencyPhone || null,
    })
    .eq('id', customerId)
}

async function activateCustomerSession(customerId: string, customer?: CustomerDraft) {
  if (customer) await syncCustomerProfile(customerId, customer)
  const profile = await fetchProfile(customerId)
  if (profile) useAuthSessionStore.getState().setUser(profile)
  return customerId
}

/** Ensures a customer profile id for booking insert (signed-in customer or guest checkout sign-up). */
export async function resolveBookingCustomerId(
  customerId: string | undefined,
  customer: CustomerDraft | undefined,
): Promise<string> {
  const supabase = getSupabaseClient()
  await supabase.auth.refreshSession()
  const { data: authData } = await supabase.auth.getSession()
  const authUser = authData.session?.user

  if (customerId && authUser?.id === customerId) {
    return activateCustomerSession(customerId, customer)
  }

  if (customerId && !authUser) {
    customerId = undefined
  }

  if (authUser) {
    const profile = await fetchProfile(authUser.id)
    if (profile?.role === 'customer') {
      return activateCustomerSession(profile.id, customer)
    }
    if (profile) {
      throw new Error('You are signed in as staff. Sign out to book as a guest, or use a customer account.')
    }
  }

  if (!customer) {
    throw new Error('Enter your contact details to complete the booking.')
  }

  const email = customer.email.trim().toLowerCase()
  const password = customer.password?.trim()
  if (!password || password.length < 8) {
    throw new Error('Choose a password for your account (at least 8 characters).')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      },
    },
  })

  if (error) {
    if (/already registered|already exists|user already/i.test(error.message)) {
      throw new Error(
        'This email already has an account. Sign in from the top menu with that email, then confirm your booking again.',
      )
    }
    throw new Error(error.message)
  }
  if (!data.user) throw new Error('Could not create your customer account.')

  if (!data.session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !signInData.session) {
      throw new Error(
        'We saved your details. Check your email to confirm your account, then sign in and confirm the booking again.',
      )
    }
  }

  await syncCustomerProfile(data.user.id, customer)
  return activateCustomerSession(data.user.id, customer)
}