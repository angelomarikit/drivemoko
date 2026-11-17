# Production deployment checklist (Vercel + Supabase)

## Vercel environment (client-safe only)

- [ ] `VITE_DATA_PROVIDER=supabase`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] **Do not** set service role, SMS, or SMTP secrets with `VITE_` prefix

## Supabase dashboard

- [ ] Auth → URL configuration: site URL + redirect URLs (`/auth/callback`, `/auth/reset-password`)
- [ ] Auth → email templates + **production SMTP** (not personal Gmail for production sender)
- [ ] SQL migrations 001–021 applied on production project (staging first)
- [ ] Storage buckets and policies (016–017)
- [ ] Edge function secrets: `EMAIL_PROVIDER_STATUS`, SMS provider keys (when ready)
- [ ] RLS enabled on all public tables (verify with Security Advisor)

## Vercel project

- [ ] `vercel.json` deployed (SPA rewrite)
- [ ] Production branch connected
- [ ] Build command: `npm run build`
- [ ] Preview deployments use separate Supabase project or strict RLS test data

## Pre-launch smoke (manual)

- [ ] Login each role (admin, owner, partner, customer)
- [ ] Create booking → approve → record payment → verify balance
- [ ] Upload vehicle image → approve listing → public catalog shows image
- [ ] Private payment proof not accessible from another customer session
- [ ] Financial report totals match SQL sums
- [ ] Mobile check on 375px width (booking form + admin table scroll)

## Rollback

- [ ] Keep previous Vercel deployment promoted
- [ ] Database migrations are forward-only — restore from Supabase backup if needed
- [ ] Toggle `VITE_DATA_PROVIDER=mock` only for emergency demo — not for production operations