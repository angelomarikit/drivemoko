# Communications roadmap (SMS & email)

Decisions as of Phase 3 (production path).

## SMS — on hold, feature retained

- **Admin UI stays:** `/admin/sms` (templates, test send, activity log).
- **No live gateway** in Phases 2–4. No paid SMS provider wired yet.
- **Mock / preview only:** Template edits and “test send” do not contact a carrier. In Supabase mode, send shows an on-hold notice instead of failing silently.
- **Later phase:** Real SMS (Edge Function + provider), `sms_templates` / `sms_logs` in DB, consent and logging. Likely **after** core bookings/payments (Phase 4+) or bundled with final hardening.

Do **not** remove SMS screens, routes, or template shapes from the codebase.

## Email verification — not in Phase 2

Phase 2 auth is **email + password** with **immediate session** when Supabase allows it.

- **Supabase Dashboard:** Keep **Confirm email** **disabled** for now unless you explicitly want restricted sign-up during testing.
- Register flow already supports “check your email” if you later enable confirmation; that path is **not** required today.
- **Planned for a late phase** (with production hardening):
  - Turn on email confirmation (or magic link) in Supabase Auth.
  - Align app copy and redirects after `signUp` when `data.session` is null.
  - Optional: transactional email for booking **confirmed** (separate from auth verify).

## In-app notifications

- Phase 3: `notifications` table + read (often empty).
- Booking/event emails and SMS are **not** substitutes for in-app notifications until workflows are wired in Phase 4+.

## Quick reference

| Capability | Now | Later |
|------------|-----|-------|
| Auth sign-up / login | Yes (no verify required) | Email confirmation optional |
| Booking confirmation email | No | Late phase |
| SMS to customer | UI only, on hold | Provider integration |
| In-app notifications | DB read | Create on booking events (Phase 4) |