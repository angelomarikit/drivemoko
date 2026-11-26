# Production stabilization runbook (Drive Moko)

Use this after pulling the partner-registration and snapshot fixes. Target: Supabase project + Vercel frontend.

## 1. Supabase SQL migrations

In the SQL Editor (or `supabase db push`), apply any migrations not yet on production:

| Migration | Purpose |
|-----------|---------|
| `022_partner_registration.sql` / `022b_partner_finalize_profile_fields.sql` | `admin_finalize_partner_profile`, partner contract columns |
| `039_ensure_partner_finalize_rpc.sql` | **One-shot fix** if Finalize partner returns **404** on RPC (columns + function) |
| `040_rental_package_inside_outside.sql` | Within vs outside Vizcaya rental tiers (`rate_inside_*`, `rental_service_zone` on bookings) |
| `032`–`037` | Booking guest checkout, renter docs RLS, commission |
| `038_pending_does_not_hold_calendar.sql` | Pending bookings do not block calendar until confirmed |

Verify `admin_finalize_partner_profile` exists:

```sql
select proname from pg_proc where proname = 'admin_finalize_partner_profile';
```

## 2. Edge Function: `create-partner-account`

From the repo root (Supabase CLI linked to the project):

```bash
supabase functions deploy create-partner-account
```

Secrets (Dashboard → Edge Functions → secrets or CLI):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Test: Admin → Register partner while signed in; Network tab should show `functions/v1/create-partner-account` **200**, not CORS failure.

If sign-up is disabled in Auth, this function is **required** for new partner Auth users.

## 3. Vercel frontend

Push to the branch Vercel builds and deploy, or trigger a redeploy. Env vars must include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- App provider set to Supabase (per project config)
- Optional: `VITE_PUBLIC_SITE_URL` = your production origin (same as Supabase **Site URL**)

### Auth: forgot-password lands on `localhost:3000` / connection refused

Supabase is using an old **Site URL** (`http://localhost:3000`). Reset emails then redirect there instead of Vercel.

**Fix in Supabase → Authentication → URL Configuration**

1. **Site URL:** `https://drivemoko.vercel.app` (or your custom domain)
2. **Redirect URLs** (add each line):
   - `https://drivemoko.vercel.app/auth/reset-password`
   - `https://drivemoko.vercel.app/auth/callback`
   - `http://localhost:5173/auth/reset-password`
   - `http://localhost:5173/auth/callback`
3. Save, then use **Forgot password** again on production (old emails may still point at localhost).

The app also forwards recovery tokens from `/` to `/auth/reset-password` when the link hits the live site with a hash.

## 4. Fix orphaned partner logins

Symptom: Auth user exists (e.g. `name@drivemoko.com`), Partner directory empty, role still `customer`.

**In app (after deploy):**

1. Admin → **Partners** → amber **Incomplete partner signups** banner → **Finalize as partner**, or  
2. Admin → **Register partner** → submit the same email again (app runs recovery + `admin_finalize_partner_profile`).

**In dashboard (manual):**

- Auth → Users → confirm user  
- Table Editor → `profiles` → set `role` only via `admin_finalize_partner_profile` RPC (admin session), not hand-edited unless you know the full schema

## 5. Smoke test

See [MANUAL_QA_CHECKLIST.md](./MANUAL_QA_CHECKLIST.md). First pass should show **no repeating** `profiles?select=...partner_profiles` **400** in the browser console.

## 6. Rollback

- Frontend: redeploy previous Vercel deployment.  
- SQL: migrations are forward-only; do not drop partner RPC without a backup plan.  
- Edge Function: redeploy previous version from git if needed.