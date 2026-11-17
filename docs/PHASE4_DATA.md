# Phase 4 — workflows (implemented)

Run SQL **after** Phase 3 migrations:

| Order | File |
|-------|------|
| 1 | `006_payments.sql` |
| 2 | `007_phase4_workflows.sql` (applications, favorites, inquiries, booking notifications trigger) |
| 3 | `011b_rls_phase4.sql` |

## Wired to Supabase

- **Customer booking** (`/book/:id`) — insert `bookings`, DB reference, overlap protection, profile update, in-app notifications (trigger).
- **Booking status** — admin transitions update `bookings` + history trigger from 005.
- **Payments** — record / verify / reject → `payments` + booking `payment_status`.
- **Partner apply** — `partner_applications` public insert.
- **Contact / vehicle inquiry** — `support_inquiries`.
- **Favorites** — `customer_favorites` toggle (signed-in customer).
- **Notifications** — read + mark read; created on new booking via trigger.

## Requirements / limits

- **Book online:** customer must **sign in** before confirming (production path).
- **Reviews** — still empty until a reviews table is added.
- **SMS send** — on hold (UI retained).
- **Admin create user / partner approval auth user** — manual SQL / future Auth admin API.
- **License file upload** — not stored yet (Storage Phase 4+).
- **Partner statement PDF** — CSV export from current data only.

## Production testing checklist

1. Customer login → book car → pending reference.
2. Admin → approve booking → customer notification.
3. Admin → record payment → verify → paid status.
4. Partner apply from `/become-a-partner` → admin sees application.
5. Overlapping dates on same vehicle → rejected by DB.