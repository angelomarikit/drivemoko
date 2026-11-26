import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'
import { isSupabaseProvider, supabaseConfigured } from '@/lib/config'
import type { OwnershipType } from '@/types'
import { generateSecurePassword } from '@/utils/password'

export const PARTNER_EMAIL_DOMAIN = 'drivemoko.com'

export interface RegisterPartnerInput {
  emailLocal: string
  password: string
  fullName: string
  contactPerson: string
  phone: string
  address: string
  businessName: string
  shareRatePercent: number
  vehicleCount: number
  ownershipType: OwnershipType
  vehicleSummary: string
  contractReference: string
  contractNotes: string
  contractSignedAt: string
  profileNotes: string
}

export type RegisterPartnerResult = {
  userId: string
  email: string
  /** Auth user existed; profile finalized. Form password may not match Auth — reset in Supabase if needed. */
  recovered?: boolean
}

export type IncompletePartnerSignup = {
  id: string
  email: string
  full_name: string
  role: string
}

export function buildPartnerEmail(localPart: string) {
  const local = localPart.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '')
  if (!local) throw new Error('Enter a valid username for the partner email.')
  return `${local}@${PARTNER_EMAIL_DOMAIN}`
}

export function generatePartnerPassword(length = 14) {
  return generateSecurePassword(length)
}

export function suggestEmailLocal(fullName: string) {
  return fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32)
}

function edgeTransportFailure(message: string) {
  return /function|edge function|failed to send|404|not found|cors|network|fetch failed|err_failed/i.test(message)
}

function isAlreadyRegisteredMessage(message: string) {
  return /already registered|already exists|user already|email.*already/i.test(message)
}

function partnerProvisioningError(message: string) {
  return isAlreadyRegisteredMessage(message) || /invalid email|admin only|invalid username/i.test(message)
}

function migrationHint(errorMessage: string) {
  if (/admin_finalize_partner_profile|column|partner_profiles/i.test(errorMessage)) {
    return ' Run migration 022_partner_registration.sql (or 022b if 022 was already applied).'
  }
  return ''
}

export async function lookupProfileIdByEmail(email: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabase.from('profiles').select('id').eq('email', normalized).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.id ?? null
}

export async function listIncompletePartnerSignups(): Promise<IncompletePartnerSignup[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .ilike('email', `%@${PARTNER_EMAIL_DOMAIN}`)
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as IncompletePartnerSignup[]
}

export function minimalPartnerInputFromProfile(row: {
  email: string
  full_name?: string | null
  phone?: string | null
  address?: string | null
}): RegisterPartnerInput {
  const email = row.email.trim().toLowerCase()
  const local = email.includes('@') ? email.split('@')[0]! : email
  const name = row.full_name?.trim() || local
  const today = new Date().toISOString().slice(0, 10)
  return {
    emailLocal: local,
    password: generatePartnerPassword(),
    fullName: name,
    contactPerson: name,
    phone: row.phone?.trim() || '0000000000',
    address: row.address?.trim() || '—',
    businessName: name,
    shareRatePercent: 70,
    vehicleCount: 0,
    ownershipType: 'owned',
    vehicleSummary: 'Recovered from incomplete partner signup.',
    contractReference: `DM-PARTNER-RECOVERY-${local.slice(0, 12)}`,
    contractNotes: 'Finalized from admin incomplete-partners queue.',
    contractSignedAt: today,
    profileNotes: 'Recovered via admin finalize.',
  }
}

async function finalizePartnerProfile(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  input: RegisterPartnerInput,
) {
  const shareBps = 7000
  const { error } = await supabase.rpc('admin_finalize_partner_profile', {
    p_profile_id: userId,
    p_share_rate_bps: shareBps,
    p_business_name: input.businessName,
    p_vehicle_count: input.vehicleCount,
    p_ownership_type: input.ownershipType,
    p_vehicle_summary: input.vehicleSummary,
    p_contract_reference: input.contractReference,
    p_contract_notes: input.contractNotes,
    p_contact_person: input.contactPerson || input.fullName,
    p_agreement_signed_at: input.contractSignedAt || new Date().toISOString(),
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_address: input.address,
    p_notes: input.profileNotes,
  })
  if (error) {
    const missingRpc =
      error.code === 'PGRST202' ||
      /could not find the function|function .* does not exist|404/i.test(error.message)
    if (missingRpc) {
      throw new Error(
        'Partner finalize is not installed on the database. In Supabase → SQL Editor, run migration file 039_ensure_partner_finalize_rpc.sql (or 022 + 022b), then try again.',
      )
    }
    throw new Error(error.message + migrationHint(error.message))
  }
}

export async function completePartnerProvisioning(
  input: RegisterPartnerInput,
  email: string,
): Promise<RegisterPartnerResult> {
  const userId = await lookupProfileIdByEmail(email)
  if (!userId) {
    throw new Error(
      'That email exists in Auth but has no profiles row. In Supabase, check Auth → Users and public.profiles for the same id.',
    )
  }
  await finalizePartnerProfile(getSupabaseClient(), userId, input)
  return { userId, email, recovered: true }
}

/** Sign-up on a throwaway client so the admin session is not replaced. */
async function registerPartnerWithoutEdgeFunction(
  input: RegisterPartnerInput,
  email: string,
): Promise<RegisterPartnerResult> {
  if (!supabaseConfigured()) {
    throw new Error('Supabase is not configured.')
  }
  const url = import.meta.env.VITE_SUPABASE_URL!
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!
  const signupClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data: signData, error: signError } = await signupClient.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone,
        address: input.address,
        title: 'Partner (Link)',
      },
    },
  })

  if (signError) {
    if (/signups not allowed|signup is disabled/i.test(signError.message)) {
      throw new Error(
        'Public sign-up is disabled in Supabase. Deploy the create-partner-account Edge Function (recommended) or temporarily enable sign-ups for admin provisioning.',
      )
    }
    if (isAlreadyRegisteredMessage(signError.message)) {
      return completePartnerProvisioning(input, email)
    }
    throw new Error(signError.message)
  }

  const userId = signData.user?.id
  if (!userId) {
    throw new Error(
      'Auth user was not returned. If email confirmation is required, deploy the create-partner-account Edge Function to auto-confirm partner accounts.',
    )
  }

  const adminClient = getSupabaseClient()
  await finalizePartnerProfile(adminClient, userId, input)
  return { userId, email }
}

async function registerPartnerViaEdgeFunction(
  input: RegisterPartnerInput,
  email: string,
): Promise<RegisterPartnerResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('create-partner-account', {
    body: { ...input, emailLocal: input.emailLocal },
  })
  if (error) {
    const transport = edgeTransportFailure(error.message)
    if (transport) {
      const wrapped = new Error(error.message)
      ;(wrapped as Error & { edgeTransport?: boolean }).edgeTransport = true
      throw wrapped
    }
    throw new Error(error.message)
  }
  const payload = data as { ok?: boolean; error?: string; userId?: string; email?: string }
  if (payload?.error) {
    if (isAlreadyRegisteredMessage(payload.error)) {
      return completePartnerProvisioning(input, email)
    }
    throw new Error(payload.error + migrationHint(payload.error))
  }
  if (!payload?.userId || !payload?.email) {
    throw new Error('Partner account was not created. Check Edge Function logs.')
  }
  return { userId: payload.userId, email: payload.email }
}

export async function registerPartnerAccount(input: RegisterPartnerInput): Promise<RegisterPartnerResult> {
  if (!isSupabaseProvider()) {
    throw new Error('Partner registration requires Supabase.')
  }
  const email = buildPartnerEmail(input.emailLocal)

  let edgeMessage = ''
  try {
    return await registerPartnerViaEdgeFunction(input, email)
  } catch (edgeError) {
    edgeMessage = edgeError instanceof Error ? edgeError.message : String(edgeError)
    if (partnerProvisioningError(edgeMessage)) {
      if (isAlreadyRegisteredMessage(edgeMessage)) {
        return completePartnerProvisioning(input, email)
      }
      throw edgeError instanceof Error ? edgeError : new Error(edgeMessage)
    }
    const transport =
      edgeTransportFailure(edgeMessage) ||
      Boolean((edgeError as Error & { edgeTransport?: boolean }).edgeTransport)
    if (!transport) {
      throw edgeError instanceof Error ? edgeError : new Error(edgeMessage)
    }
  }

  try {
    return await registerPartnerWithoutEdgeFunction(input, email)
  } catch (fallbackError) {
    const fb = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
    if (isAlreadyRegisteredMessage(fb)) {
      return completePartnerProvisioning(input, email)
    }
    throw new Error(
      `Could not reach create-partner-account (${edgeMessage || 'unavailable'}). Sign-up fallback failed: ${fb}`,
    )
  }
}

export async function finalizeIncompletePartnerSignup(
  profileId: string,
  input?: RegisterPartnerInput,
): Promise<RegisterPartnerResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, address')
    .eq('id', profileId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.email) throw new Error('Profile not found.')
  const payload = input ?? minimalPartnerInputFromProfile(data)
  await finalizePartnerProfile(supabase, profileId, payload)
  return { userId: profileId, email: data.email, recovered: true }
}