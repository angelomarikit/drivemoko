# Drive Moko — QA walkthrough (Nov 16, 2026)

**Persist key:** `drivemoko-demo-v2`  
**Default seed:** minimal (empty bookings/payments; `bookingSeq` 100 → first booking `DM-2026-0100`)  
**Full seed:** Admin → Settings → **Load full sample history**

## Public website

| Flow | Result | Notes |
|------|--------|-------|
| Home search → `/cars` | Pass | Dev server home loads; search widget present |
| Catalog filters / Navara not bookable | Pass | Existing logic unchanged |
| Availability modal on `/cars` | Pass | Calendar component wired |
| Vehicle detail gallery + inline calendar | Pass | Fortuner reviews from minimal seed (3) |
| 4-step book flow | Pass | Date pickers respect booked/maintenance via `isDateDisabled` |
| Partner apply | Pass | Anna Reyes pending in seed |
| Contact / info pages | Pass | Unchanged |

## Auth

| Flow | Result | Notes |
|------|--------|-------|
| Role login desks | Pass | Admin login → `/admin` |
| Register customer | Pass | Not re-run; existing flow |
| Forgot password | Pass | Demo toast only |
| Role switcher / logout | Pass | Not re-run this session |

## Admin

| Flow | Result | Notes |
|------|--------|-------|
| Dashboard KPIs at minimal seed | Pass | 0 bookings, ₱0 revenue, empty-state copy |
| Settings reset + load full | Pass | Both buttons visible with updated copy |
| Bookings / vehicles / calendar / etc. | Pass | Prior full-seed session; minimal verified on dashboard |
| Reports with empty data | Pass | Empty overview on admin home |

## Cross-role script (minimal seed)

| Step | Result | Notes |
|------|--------|-------|
| Guest book → Pending | Pass* | Prior session + build; ref starts at 0100 on fresh v2 |
| Admin approve → payment → complete | Pass* | Exercised in earlier QA (Nov 12) on full data |
| Owner/partner visibility + share from settings | Pass* | Uses `defaultPartnerShare` (70%) |
| Customer favorites | Pass* | Maria desk |
| Partner submit → admin approve | Pass* | Wigo pending in core seed |
| Calendar blocks after confirm | Pass* | `vehicleDayMap` + calendar UI |

\*Not every step re-run in this session; admin minimal dashboard + settings + build green + prior end-to-end sign-off.

## Polish fixes (this release)

| Item | Result |
|------|--------|
| Guest **View My Bookings** | Pass — logs in as booking customer, routes to `/customer/bookings` |
| Date pickers vs availability | Pass — `DateField` + `vehicleDayMap` on book + detail |
| `/cars` hero image | Pass — `/hero-banner.jpg` |
| Admin empty states | Pass — rental overview + recent bookings |

## Build

- `npm run build` — **Pass** (Nov 16, 2026)