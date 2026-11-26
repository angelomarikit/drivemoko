import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PARTNER_EMAIL_DOMAIN = 'drivemoko.com'

type PartnerRegistrationBody = {
  emailLocal: string
  password: string
  fullName: string
  contactPerson?: string
  phone: string
  address: string
  businessName: string
  shareRatePercent: number
  vehicleCount: number
  ownershipType: 'owned' | 'financed' | 'fleet'
  vehicleSummary: string
  contractReference: string
  contractNotes?: string
  contractSignedAt?: string
  profileNotes?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization.' }), { status: 401, headers: corsHeaders })
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
  const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: caller, error: userError } = await userClient.auth.getUser()
    if (userError || !caller.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401, headers: corsHeaders })
    }

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', caller.user.id).maybeSingle()
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only.' }), { status: 403, headers: corsHeaders })
    }

    const body = (await req.json()) as PartnerRegistrationBody
    const local = body.emailLocal.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '')
    if (!local) {
      return new Response(JSON.stringify({ error: 'Invalid email username.' }), { status: 400, headers: corsHeaders })
    }
    const email = `${local}@${PARTNER_EMAIL_DOMAIN}`

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        phone: body.phone,
        address: body.address,
        title: 'Partner (Link)',
      },
    })
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Could not create auth user.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = created.user.id
    await adminClient
      .from('profiles')
      .update({
        role: 'partner',
        full_name: body.fullName,
        email,
        phone: body.phone,
        address: body.address,
        title: 'Partner (Link)',
        notes: body.profileNotes ?? '',
      })
      .eq('id', userId)

    const shareBps = 7000
    const { error: finalizeError } = await adminClient.rpc('admin_finalize_partner_profile', {
      p_profile_id: userId,
      p_share_rate_bps: shareBps,
      p_business_name: body.businessName,
      p_vehicle_count: body.vehicleCount,
      p_ownership_type: body.ownershipType,
      p_vehicle_summary: body.vehicleSummary,
      p_contract_reference: body.contractReference,
      p_contract_notes: body.contractNotes ?? '',
      p_contact_person: body.contactPerson ?? body.fullName,
      p_agreement_signed_at: body.contractSignedAt ?? new Date().toISOString(),
      p_full_name: body.fullName,
      p_phone: body.phone,
      p_address: body.address,
      p_notes: body.profileNotes ?? '',
    })
    if (finalizeError) {
      return new Response(JSON.stringify({ error: finalizeError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        userId,
        email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})