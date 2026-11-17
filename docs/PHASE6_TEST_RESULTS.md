# Phase 6 — Test results

**Environment:** Local agent run only unless noted.  
**Production-ready:** **No** — external DB and E2E not executed here.

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Customer booking E2E | **Not run** | Needs staging Supabase + mail |
| 2 | Double booking | **Not run** | DB constraint `bookings_no_overlap` in 005 |
| 3 | Payment verification | **Not run** | Code: `sync_booking_payment_status` |
| 4 | Partner vehicle approval | **Not run** | Staging bucket + admin approve |
| 5 | Financial settlement | **Not run** | Phase 5 migrations |
| 6 | Check-out / return | **Not run** | Migration 018 + admin UI |
| 7 | Role isolation | **Not run** | Manual API/RLS tests required |
| 8 | Storage security | **Not run** | After 017 |
| 9 | Password recovery | **Not run** | Auth redirect URLs |
| 10 | Mobile navigation | **Not run** | Playwright viewport tests |

## Automated (local)

| Command | Status |
|---------|--------|
| `npm run build` | Run after `npm install` |
| `npm run test` | `tests/bookingRules.test.ts` (2 assertions) |
| `npm run test:e2e` | Smoke spec **skipped** |

## Required next steps

1. Staging project with migrations 001–021 applied.
2. Configure Supabase Auth URLs and test reset + verify flows.
3. Implement and deploy email edge worker; verify outbox → sent.
4. Un-skip and expand `e2e/*.spec.ts` with test accounts.
5. Run Supabase Security Advisor and document results here.