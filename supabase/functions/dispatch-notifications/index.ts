// Supabase Edge Function (deploy separately). Uses service role + SMTP/SMS secrets — never in VITE_.
// Deno.serve handler: poll notification_outbox where status=pending, send email, mark sent/failed.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const EMAIL_PROVIDER = Deno.env.get('EMAIL_PROVIDER_STATUS') ?? 'not_configured'

Deno.serve(async () => {
  if (EMAIL_PROVIDER !== 'configured') {
    return new Response(
      JSON.stringify({ ok: true, delivered: 0, note: 'Email provider not configured' }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }
  return new Response(
    JSON.stringify({ ok: false, error: 'Implement provider dispatch before enabling in production.' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  )
})