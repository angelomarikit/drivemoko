/** Parse `#access_token=...&type=recovery` from Supabase email links (implicit flow). */
export function parseAuthHashParams(): URLSearchParams | null {
  const raw = window.location.hash
  if (!raw || raw.length < 2) return null
  return new URLSearchParams(raw.slice(1))
}

/** Origin used in Auth email `redirectTo` (current site, or `VITE_PUBLIC_SITE_URL` when set). */
export function authRedirectPath(path: string): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  const origin = configured || window.location.origin
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalized}`
}

/**
 * Supabase sometimes sends recovery tokens to Site URL root (`/`) instead of `/auth/reset-password`
 * when redirect URLs are not allowlisted. Move the user (and hash) to the reset page.
 */
export function redirectAuthHashIfNeeded(): boolean {
  const params = parseAuthHashParams()
  if (!params?.get('access_token')) return false

  const type = params.get('type')
  const { pathname, origin, hash, search } = window.location

  if (type === 'recovery' && pathname !== '/auth/reset-password') {
    window.location.replace(`${origin}/auth/reset-password${hash}`)
    return true
  }

  if (
    (type === 'signup' || type === 'invite' || type === 'email' || type === 'magiclink') &&
    pathname !== '/auth/callback'
  ) {
    window.location.replace(`${origin}/auth/callback${search}${hash}`)
    return true
  }

  return false
}