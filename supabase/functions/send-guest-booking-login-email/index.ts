import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Body = {
  email: string
  password: string
  reference: string
  bookingId: string
  customerId: string
  loginUrl: string
}

async function sendViaResend(from: string, to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false as const, skipped: true, reason: 'RESEND_API_KEY not set' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { ok: false as const, skipped: false, reason: text || res.statusText }
  }
  return { ok: true as const, skipped: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: caller, error: userError } = await userClient.auth.getUser()
    if (userError || !caller.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as Body
    if (!body.email?.trim() || !body.password || !body.reference || !body.bookingId || !body.customerId) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (caller.user.id !== body.customerId) {
      return new Response(JSON.stringify({ error: 'Customer mismatch.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('id, reference, customer_id')
      .eq('id', body.bookingId)
      .maybeSingle()
    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (booking.customer_id !== body.customerId || booking.reference !== body.reference) {
      return new Response(JSON.stringify({ error: 'Booking verification failed.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const from = Deno.env.get('BOOKING_FROM_EMAIL') ?? 'Drive Moko <bookings@drivemoko.com>'
    const loginUrl = body.loginUrl?.trim() || 'https://drivemoko.com/login'
    const subject = `Drive Moko — booking ${body.reference} received`
    const html = `
      <p>Hi,</p>
      <p>We received your car rental request <strong>${body.reference}</strong>. Our team will review it and confirm availability.</p>
      <p><strong>Sign in to track your booking:</strong></p>
      <ul>
        <li>Login page: <a href="${loginUrl}">${loginUrl}</a></li>
        <li>Email: ${body.email.trim()}</li>
        <li>Password: ${body.password}</li>
      </ul>
      <p>Keep this email safe. You can change your password anytime after signing in.</p>
      <p>— Drive Moko Car Rentals</p>
    `.trim()

    const sent = await sendViaResend(from, body.email.trim().toLowerCase(), subject, html)
    if (!sent.ok) {
      if (sent.skipped) {
        return new Response(JSON.stringify({ ok: false, skipped: true, reason: sent.reason }), {
          status: 501,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: sent.reason ?? 'Email send failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})