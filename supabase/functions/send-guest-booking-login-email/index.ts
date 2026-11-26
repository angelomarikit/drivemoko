// DEPRECATED — guest checkout uses Supabase Auth emails (signInWithOtp) from the app client.
// This function is kept for reference only; safe to delete after deploy cleanup.

Deno.serve(() =>
  new Response(JSON.stringify({ deprecated: true, use: 'supabase_auth_emails' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 410,
  }),
)