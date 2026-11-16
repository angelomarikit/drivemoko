# Drive Moko implementation checklist

Reference map:

- `public/Drive Moko Mountain Road Rentals.png` — homepage hero, navigation, booking search, how-it-works
- `public/Drive Moko Available Cars Dashboard.png` — vehicle catalog and filters
- `public/Toyota Fortuner Rental Details.png` — vehicle details and booking widget
- `public/Drive Moko Car Rental Booking Page.png` — four-step booking
- `public/Drive Moko Partner Landing Page.png` — partner application
- `public/Drive Moko Car Rentals Dashboard.png` — admin dashboard
- `public/Drive Moko Owner Dashboard.png` — car owner dashboard
- `public/Drive Moko Partner Dashboard.png` — links / partner dashboard
- `public/logo.jpg`, `public/cover.jpg` — brand assets

- [x] Foundation: Vite, React, TypeScript, Tailwind v4, routing, design tokens
- [x] Shared demo state, repositories, and pricing rules
- [x] Public website
- [x] Demo authentication
- [x] Admin dashboard and operations pages
- [x] Owner, partner, and customer dashboards
- [x] Cross-role updates through one dataset
- [x] Browser checks on the running demo (http://localhost:5174)
- [x] Minimal walkthrough seed default (`createMinimalSeed`, persist `drivemoko-demo-v2`)
- [x] Settings: reset minimal + load full sample history
- [x] QA walkthrough documented in `QA-WALKTHROUGH.md`

Verified in the browser on Nov 12, 2026 (full sample history):

- Fortuner booking Nov 18–20 priced at ₱11,000 and saved as DM-2026-0146, status Pending
- Admin approved it; owner and partner both show it Confirmed, partner share ₱7,700 (70% of ₱11,000)
- Maria Santos still sees only her own Vios booking and favorites
- Calendar shows DM-2026-0146 and Hiace maintenance
- Reports verified revenue matches the admin KPI (₱489,500)
- Test SMS wrote a simulated log and did not leave the app

Verified in the browser on Nov 16, 2026 (minimal seed / v2):

- Fresh load shows **0** bookings and ₱0 revenue on admin dashboard
- Empty-state copy on rental overview and recent bookings
- Admin **Settings** shows reset + load full sample history actions
- Public `/cars` uses `/hero-banner.jpg`

Still different from the screenshots on purpose or because assets are missing:

- KPI figures are calculated from the demo records, not the mockup numbers
- Vehicle and hero photos are labeled stock images
- Dashboard tables do not include the screenshot vehicle thumbnails
- Contact phone and address stay labeled placeholders
