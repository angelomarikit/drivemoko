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

function partnerProvisioningError(message: string) {
  return /already registered|already exists|invalid email|admin only|invalid username/i.test(message)
}

function migrationHint(errorMessage: string) {
  if (/admin_finalize_partner_profile|column|partner_profiles/i.test(errorMessage)) {
    return ' Run migration 022_partner_registration.sql (or 022b if 022 was already applied).'
  }
  return ''
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
    throw new Error(error.message + migrationHint(error.message))
  }
}

/** Sign-up on a throwaway client so the admin session is not replaced. */
async function registerPartnerWithoutEdgeFunction(
  input: RegisterPartnerInput,
  email: string,
): Promise<{ userId: string; email: string }> {
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
    if (/already registered|already exists/i.test(signError.message)) {
      throw new Error('That @drivemoko.com address is already registered.')
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
): Promise<{ userId: string; email: string }> {
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
  if (payload?.error) throw new Error(payload.error + migrationHint(payload.error))
  if (!payload?.userId || !payload?.email) {
    throw new Error('Partner account was not created. Check Edge Function logs.')
  }
  return { userId: payload.userId, email: payload.email }
}

export async function registerPartnerAccount(input: RegisterPartnerInput): Promise<{ userId: string; email: string }> {
  if (!isSupabaseProvider()) {
    throw new Error('Partner registration requires Supabase.')
  }
  const email = buildPartnerEmail(input.emailLocal)

  let edgeMessage = ''
  try {
    return await registerPartnerViaEdgeFunction(input)
  } catch (edgeError) {
    edgeMessage = edgeError instanceof Error ? edgeError.message : String(edgeError)
    if (partnerProvisioningError(edgeMessage)) {
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
    throw new Error(
      `Could not reach create-partner-account (${edgeMessage || 'unavailable'}). Sign-up fallback failed: ${fb}`,
    )
  }
}