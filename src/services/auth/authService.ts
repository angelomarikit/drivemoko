import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuthSessionStore } from '@/stores/authSessionStore'
import type { Role, User } from '@/types'

type ProfileRow = {
  id: string
  role: Role
  full_name: string
  email: string
  phone: string
  address: string
  title: string
  status: 'active' | 'suspended'
  license_number: string | null
  emergency_name: string | null
  emergency_phone: string | null
  notes: string | null
  created_at: string
  partner_profiles: { share_rate_bps: number }[] | { share_rate_bps: number } | null
}

function mapProfileToUser(row: ProfileRow): User {
  const partner =
    row.partner_profiles == null
      ? null
      : Array.isArray(row.partner_profiles)
        ? row.partner_profiles[0]
        : row.partner_profiles
  return {
    id: row.id,
    role: row.role,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    title: row.title,
    status: row.status,
    shareRate: partner ? partner.share_rate_bps / 100 : undefined,
    licenseNumber: row.license_number ?? undefined,
    emergencyName: row.emergency_name ?? undefined,
    emergencyPhone: row.emergency_phone ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, role, full_name, email, phone, address, title, status, license_number, emergency_name, emergency_phone, notes, created_at',
    )
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (error.code === '42501' || error.message.toLowerCase().includes('permission')) {
      throw new Error('Cannot read profile (RLS). Run migration 002d_profiles_read_own.sql in Supabase SQL Editor.')
    }
    throw new Error(error.message)
  }
  if (!data) return null

  const row = data as ProfileRow
  const base = mapProfileToUser({ ...row, partner_profiles: null })
  if (row.role === 'partner') {
    const { data: partner } = await supabase
      .from('partner_profiles')
      .select('share_rate_bps')
      .eq('profile_id', userId)
      .maybeSingle()
    const bps = (partner as { share_rate_bps?: number } | null)?.share_rate_bps
    if (bps != null) base.shareRate = bps / 100
  }
  return base
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sign-in failed.')
  const profile = await fetchProfile(data.user.id)
  if (!profile) {
    throw new Error(
      'No profile row for this account. In Supabase SQL Editor run 002c_backfill_auth_profiles.sql (Auth user exists but profiles row is missing).',
    )
  }
  if (profile.status === 'suspended') {
    await supabase.auth.signOut()
    throw new Error('This account is suspended. Contact Drive Moko support.')
  }
  useAuthSessionStore.getState().setUser(profile)
  return profile
}

export interface RegisterCustomerInput {
  name: string
  email: string
  phone: string
  address: string
  password: string
}

function authRedirectPath(path: string) {
  return `${window.location.origin}${path}`
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const supabase = getSupabaseClient()
  const email = input.email.trim().toLowerCase()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: authRedirectPath('/auth/callback?type=signup'),
      data: {
        full_name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address.trim(),
      },
    },
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Registration failed.')

  if (!data.session) {
    return { user: null as User | null, needsEmailConfirmation: true }
  }

  const profile = await fetchProfile(data.user.id)
  if (profile) useAuthSessionStore.getState().setUser(profile)
  return { user: profile, needsEmailConfirmation: false }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
  useAuthSessionStore.getState().setUser(null)
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authRedirectPath('/auth/reset-password'),
  })
  if (error) throw new Error(error.message)
}

export async function updatePasswordFromRecovery(password: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export async function resendVerificationEmail(email: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: authRedirectPath('/auth/callback?type=signup') },
  })
  if (error) throw new Error(error.message)
}

export async function getAuthUserEmailVerified() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  return Boolean(data.user?.email_confirmed_at)
}