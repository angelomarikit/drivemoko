# Drive Moko — Production implementation plan

**Goal:** Upgrade the existing React app to a Supabase-backed production system **without** replacing UI shells or rebuilding from scratch.

**Principles:**

1. Repository boundary already exists — implement Supabase behind `DemoRepository`-shaped APIs, then split into domain repos.
2. One vertical slice at a time (auth → vehicles → bookings → payments).
3. Keep mock provider behind `VITE_DATA_PROVIDER=mock` until parity is proven.
4. No destructive SQL without explicit approval.
5. No fake dashboard numbers — empty states when DB is empty.

---

## Phase 0 — Foundation (current sprint)

| # | Task | Outcome | Owner action |
|---|------|---------|--------------|
| 0.1 | `docs/PRODUCTION_AUDIT.md` | Baseline | Done |
| 0.2 | `docs/IMPLEMENTATION_PLAN.md` | Roadmap | Done |
| 0.3 | Create Supabase project | URL + anon key | You: Supabase dashboard |
| 0.4 | Add env template | `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Dev |
| 0.5 | Install `@supabase/supabase-js` | Dependency only when starting Phase 1 | Dev |

**Exit criteria:** Audit signed off; Supabase project exists; secrets not committed.

---

## Phase 1 — Database schema & RLS (no app wire yet)

Deliverables in `supabase/migrations/` (run **in order** in SQL Editor — see `supabase/migrations/README.md`):

1. `001_extensions_and_types.sql` — `uuid-ossp`, enums (booking_status, roles, payment_status, …)
2. `002_profiles_and_roles.sql` — `profiles`, `user_roles`, triggers on `auth.users`
3. `003_vehicles.sql` — vehicles, images metadata, listing approval
4. `004_availability.sql` — maintenance / blocks
5. `005_bookings.sql` — bookings, addons, status history, **exclusion constraint or booking lock function**
6. `006_payments.sql` — amounts in **centavos** (`bigint`), proofs metadata
7. `007_partners.sql` — applications, agreements, earnings views
8. `008_notifications_sms.sql` — notifications, templates, logs
9. `009_settings_inquiries.sql` — system_settings, locations, inquiries
10. `010_storage_buckets.sql` — vehicle images, payment proofs (private)
11. `011_rls_policies.sql` — enable RLS + policies per role
12. `012_functions_triggers.sql` — reference generation, status audit, updated_at

**You run SQL → Dev runs verification queries from README → Dev proceeds.**

**Exit criteria:** All verification queries pass; RLS tested with test JWTs (admin, owner, partner, customer).

---

## Phase 2 — Auth & session layer

| Task | Detail |
|------|--------|
| Supabase Auth | Email/password; optional email confirm |
| Replace login/register | Remove demo desks; keep layout |
| `useSession` | Read `profiles` + role from DB, not `sessionUserId` in Zustand |
| `Guard` | Wait on auth loading; redirect unauthenticated |
| Remove demo switcher | Production builds only |
| Admin provisioning | Edge function or SQL seed for first admin; no public admin register |
| Partner onboarding | Application → admin approve → invite / create user with partner role |
| Owner onboarding | Admin-created accounts only |

**Exit criteria:** Each role reaches correct dashboard; customer self-register works; role escalation impossible from client.

---

## Phase 3 — Repository migration (read paths)

| Order | Domain | UI surfaces unchanged |
|-------|--------|------------------------|
| 3.1 | Vehicles + public catalog | `/`, `/cars`, `/cars/:id` |
| 3.2 | Bookings list + detail | Dashboards, scoped queries via RLS |
| 3.3 | Availability | Calendar + `vehicleDayMap` fed from API |
| 3.4 | Notifications | Bell dropdown, customer notifications |
| 3.5 | Settings | Admin settings (no reset demo) |

Replace `useDemoStore` reads with TanStack Query + Supabase repositories. **Retain mock provider** for Storybook/local until 3.5 done.

**Exit criteria:** Fresh Supabase DB shows empty states; seeded staging data displays correctly.

---

## Phase 4 — Write paths & workflows

| Workflow | Requirements |
|----------|----------------|
| Public booking | Insert `pending` booking; reference from DB; concurrency check |
| Admin approve/reject/cancel | Status history rows; notifications |
| Checkout / return (ongoing / completed) | Optional `rental_checkouts` / `rental_returns` tables |
| Payments | Record, upload proof to Storage, verify/reject |
| Vehicles | CRUD, image upload, partner submit → pending approval |
| Partner applications | Public submit → admin review |
| Calendar book | Date selection → `/book` with real availability |
| Favorites | `customer_favorites` join table |

**Exit criteria:** Cross-role script (guest book → admin approve → pay → complete) on staging **TESTED**.

---

## Phase 5 — Financial reporting & partner earnings

| Task | Detail |
|------|--------|
| Define revenue rule | Document: verified payments only vs recognized on completed |
| Reports / KPIs | SQL views or RPC; remove synthetic “% vs last 30 days” unless computed |
| Partner share | From `partner_agreements.share_rate`, not hardcoded 70% |
| Statements | Generate from DB, not client CSV mock |

---

## Phase 6 — Communications, hardening, deploy

| Task | Detail |
|------|--------|
| SMS | **On hold** until late phase; retain `/admin/sms` UI; then Edge function + provider + `sms_logs` |
| Email verification | Enable Supabase confirm-email + app redirects (`COMMUNICATIONS_ROADMAP.md`) |
| Transactional email | Booking confirmed / receipts (optional; after Phase 4 bookings) |
| Remove demo seed from prod bundle | Tree-shake or env-gate `seed.ts` |
| Security review | RLS penetration pass, Storage policies |
| Rate limits / abuse | Supabase + optional Edge |
| Vercel | Env vars, preview vs production Supabase |
| E2E checklist | Extend `QA-WALKTHROUGH.md` for production |

---

## Priority matrix (from audit)

| P0 | P1 | P2 |
|----|----|-----|
| Auth + RLS | Owner/partner dashboards wired | SMS |
| Bookings + double-book DB | Calendar / reports | Statements |
| Payments + revenue definition | Partner applications | Contact inquiries email |
| Remove demo reset/switcher | Vehicles + Storage images | About/how-it-works content |

---

## Dependency policy

- Add **`@supabase/supabase-js`** in Phase 1/2 only.
- Do **not** add ORM; use Supabase client + typed generated types (`supabase gen types`).
- Avoid new UI libraries; keep existing Radix + Tailwind components.

---

## Next actions (recommended)

1. You: Create Supabase project and confirm region.
2. Dev: Generate `001`–`005` migration SQL (core schema + booking constraint) for your review.
3. You: Run migrations in SQL Editor; paste verification results.
4. Dev: Phase 2 auth on a feature branch while keeping `mock` default locally.

Say when your Supabase project is ready and we will generate **migration `001`–`005`** as the first SQL drop (no app breakage until you flip `VITE_DATA_PROVIDER`).