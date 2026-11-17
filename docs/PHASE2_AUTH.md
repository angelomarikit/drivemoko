# Phase 2 — Supabase authentication

## What changed in the app

| Piece | Behavior |
|-------|----------|
| `VITE_DATA_PROVIDER` | `mock` (default) = demo login. `supabase` = email/password auth. |
| `AuthProvider` | Restores Supabase session and loads `public.profiles`. |
| `useSession()` | Supabase profile when provider is `supabase`; demo user otherwise. |
| Login / register / forgot | Production forms when `supabase`; demo desks when `mock`. |
| Demo role switcher | Hidden when `VITE_DATA_PROVIDER=supabase`. |
| Business data | **Still mock (Zustand)** until Phase 3 — dashboards may show empty or demo-local data not tied to your Auth user id. |

## Local setup

1. Copy `.env.example` → `.env.local`.
2. Set:

```env
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. Run migrations **001**, **002**, **002b** (recommended), **003–005** if not done yet.
4. `npm run dev` — use **Sign in**, not demo desks.

## Provision accounts (manual)

### First administrator

1. **Authentication → Users → Add user** (email + password) in Supabase, or register as customer then promote.
2. **If the user was created in the Dashboard before migration 002**, run **`002c_backfill_auth_profiles.sql`** first (an `UPDATE` alone does nothing when no `profiles` row exists).
3. Run **`002d_profiles_read_own.sql`** so signed-in users can load their profile.
4. Edit the email in `002c` if needed, or run:

```sql
update public.profiles
set role = 'admin', title = 'Administrator', full_name = 'Drive Moko Admin'
where lower(email) = lower('admin@drivemoko.com');
```

5. Sign in at `/login` → should land on `/admin`.

### Car owner

No public registration. Admin creates Auth user, then:

```sql
update public.profiles
set role = 'owner', title = 'Car Owner', full_name = 'Owner Name'
where lower(email) = lower('owner@example.com');

insert into public.owner_profiles (profile_id, business_name)
select id, 'Owner Business Name'
from public.profiles
where lower(email) = lower('owner@example.com')
on conflict do nothing;
```

### Partner (Links)

Customer applies on site (Phase 4 DB) or admin invites. After Auth user exists:

```sql
update public.profiles
set role = 'partner', title = 'Partner'
where lower(email) = lower('partner@example.com');

insert into public.partner_profiles (profile_id, share_rate_bps)
select id, 7000
from public.profiles
where lower(email) = lower('partner@example.com')
on conflict do nothing;
```

### Customer

Use **Create an account** at `/register` (role forced to `customer` via `002b` trigger).

## Supabase Auth settings

- Enable **Email** provider.
- **Confirm email:** leave **OFF** for Phase 2–3 (you did not require verification in Phase 2). Enable in a **later phase** — see `docs/COMMUNICATIONS_ROADMAP.md`.
- If you turn confirmation on early, register may return no session; the app will show “check your email” until the user confirms.
- **Site URL** / redirect URLs: add `http://localhost:5173` (dev) and production URL for password reset.

## SMS (admin)

SMS is **on hold** for production integration. Keep using `/admin/sms` for template layout only; no real sends until a later phase (`docs/COMMUNICATIONS_ROADMAP.md`).

## Security notes (Phase 2)

- RLS is **not** fully deployed until migration **011** — restrict who can `select`/`update` `profiles` before production.
- Run **`002b_auth_signup_hardening.sql`** so clients cannot pass `admin` in signup metadata.
- Never put the **service role** key in the Vite app.

## Phase 2 test checklist

- [ ] Customer register → `/customer` (or email confirm message).
- [ ] Customer login → `/customer`.
- [ ] Admin SQL promote → login → `/admin`.
- [ ] Owner login → `/owner` (wrong role cannot open `/admin`).
- [ ] Partner login → `/partner`.
- [ ] Suspended profile → sign-in rejected.
- [ ] Logout → `/login`, protected routes redirect.
- [ ] Forgot password sends email (Supabase configured).
- [ ] `VITE_DATA_PROVIDER=mock` still shows demo desks and switcher.

## Next: Phase 3

Swap `repositories` to Supabase reads; scope bookings/vehicles by authenticated `profiles.id`.