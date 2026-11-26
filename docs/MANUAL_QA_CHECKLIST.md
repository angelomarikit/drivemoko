# Manual QA checklist (production)

Site: `https://drivemoko.vercel.app` (or your deployment URL)  
Date: ___________  
Tester: ___________

Before testing: hard refresh, DevTools → Network, filter `supabase`. **Fail** if the same `profiles` request returns **400** in a loop.

| Area | Step | Pass | Fail | First failing request (if any) |
|------|------|:----:|:----:|-------------------------------|
| **Auth** | Admin login / logout | ☐ | ☐ | |
| **Auth** | Customer register + login | ☐ | ☐ | |
| **Auth** | Partner login | ☐ | ☐ | |
| **Public** | Cars → vehicle → book (guest + password) → success step | ☐ | ☐ | |
| **Public** | Two pending bookings same dates both allowed; first **confirmed** blocks second | ☐ | ☐ | |
| **Admin** | Partners directory loads | ☐ | ☐ | |
| **Admin** | Register partner → appears in directory without hard refresh | ☐ | ☐ | |
| **Admin** | Re-submit same partner email → finalize / recover, no dead-end error | ☐ | ☐ | |
| **Admin** | Incomplete signups banner → Finalize | ☐ | ☐ | |
| **Admin** | Booking detail → renter documents + contract | ☐ | ☐ | |
| **Admin** | Approve / reject booking | ☐ | ☐ | |
| **Admin** | Vehicles add/edit, assign partner | ☐ | ☐ | |
| **Admin** | Settings save | ☐ | ☐ | |
| **Partner** | Reservations scoped to own fleet | ☐ | ☐ | |
| **Customer** | Bookings list, profile | ☐ | ☐ | |

## Notes

_Add failures, screenshots, booking refs, or emails here._