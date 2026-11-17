import { getSupabaseClient } from '@/lib/supabase/client'
import { fetchProfile } from '@/services/auth/authService'
import { useAuthSessionStore } from '@/stores/authSessionStore'
import type { CustomerDraft } from '@/types'
import { generateSecurePassword } from '@/utils/password'

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

/** Ensures a customer profile id for booking insert (signed-in customer or guest checkout sign-up). */
export async function resolveBookingCustomerId(
  customerId: string | undefined,
  customer: CustomerDraft | undefined,
): Promise<string> {
  if (customerId) return customerId

  const supabase = getSupabaseClient()
  const { data: authData } = await supabase.auth.getSession()
  const authUser = authData.session?.user

  if (authUser) {
    const profile = await fetchProfile(authUser.id)
    if (profile?.role === 'customer') {
      if (customer) await syncCustomerProfile(profile.id, customer)
      useAuthSessionStore.getState().setUser(profile)
      return profile.id
    }
    if (profile) {
      throw new Error('You are signed in as staff. Sign out to book as a guest, or use a customer account.')
    }
  }

  if (!customer) {
    throw new Error('Enter your contact details to complete the booking.')
  }

  const email = customer.email.trim().toLowerCase()
  const password = generateSecurePassword()
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
        'This email already has an account. Sign in from the top menu, then return here and confirm your booking.',
      )
    }
    throw new Error(error.message)
  }
  if (!data.user) throw new Error('Could not create your customer account.')
  if (!data.session) {
    throw new Error(
      'Confirm your email first (check your inbox), then sign in and submit the booking again.',
    )
  }

  await syncCustomerProfile(data.user.id, customer)
  const profile = await fetchProfile(data.user.id)
  if (profile) useAuthSessionStore.getState().setUser(profile)
  return data.user.id
}