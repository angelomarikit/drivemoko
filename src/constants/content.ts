export const BRAND = {
  name: 'Drive Moko',
  line: 'Car Rentals',
  place: 'Nueva Vizcaya',
  company: 'Nehemiah Sales and Services Corporation',
  tagline: 'Susi Mo Sa Masayang Biyahe!',
  support: 'Rent a car in Nueva Vizcaya for business, family trips, and everyday travel.',
}

export const DEMO_ACCOUNTS = [
  { id: 'user-admin', role: 'Administrator', email: 'admin@drivemoko.demo', blurb: 'Full operations dashboard' },
  { id: 'user-partner', role: 'Links / Partner', email: 'partner@drivemoko.demo', blurb: 'Nehemiah Sales share' },
  { id: 'user-maria', role: 'Customer', email: 'customer@drivemoko.demo', blurb: 'Maria Santos bookings' },
] as const

export const DEFAULT_INCLUSIONS = [
  'Well-maintained vehicle',
  'Basic insurance coverage',
  '24/7 booking support',
  'Roadside assistance (subject to terms)',
]

export const RENTAL_TERMS = [
  'Bookings remain Pending until Drive Moko confirms vehicle availability.',
  'Self-drive renters must present a valid driver\'s license at pickup. With-driver rentals include a professional driver.',
  'Return the vehicle with the agreed fuel level. Extra cleaning, damage, or late return may incur charges per company policy.',
  'Confirmed and ongoing rentals block the vehicle calendar. Cancelled or rejected requests release those dates.',
  'Payment terms and security deposits are confirmed when your booking is approved.',
]

export const REQUIREMENTS = [
  { title: 'Valid driver\'s license', body: 'Required for self-drive. With-driver bookings can be arranged without the renter driving.' },
  { title: 'Government-issued ID', body: 'Shown at pickup. Upload of license images will be enabled in a future update.' },
  { title: 'Approved booking', body: 'Wait for the Pending request to become Confirmed before traveling.' },
  { title: 'Agreed schedule', body: 'Pickup and return follow the dates and times on the booking reference.' },
]

export const FAQS = [
  {
    q: 'How do I book a car?',
    a: 'Search available vehicles, choose your dates and rental type, then submit the booking. It stays pending until Drive Moko confirms it.',
  },
  {
    q: 'Can I request a driver?',
    a: 'Yes. Choose With Driver on the search or booking form. The demo adds a daily driver fee so the total stays visible before you confirm.',
  },
  {
    q: 'Which areas do you serve?',
    a: 'This demo is set in Nueva Vizcaya, including Bayombong, Solano, Bambang, and nearby towns. Pickup points in the list are sample locations.',
  },
  {
    q: 'How are payments handled?',
    a: 'The demo records Cash, GCash, Maya, and bank transfer submissions for an administrator to verify. No real payment is processed.',
  },
  {
    q: 'Can I cancel?',
    a: 'Pending and confirmed bookings can be cancelled in the demo. Ongoing rentals stay on the calendar until the vehicle is marked returned.',
  },
  {
    q: 'How do partners earn?',
    a: 'Each partner has a configurable share rate. Earnings on partner vehicles use that rate. The sample partner rate is stored on the partner record, not fixed in the screens.',
  },
]

export const TESTIMONIALS = [
  {
    name: 'Maria Santos',
    trip: 'Solano weekend',
    quote: 'The booking steps were clear, and the confirmation showed the exact dates and total before I paid. Demo story.',
  },
  {
    name: 'Paolo Ramos',
    trip: 'Family trip',
    quote: 'We compared self-drive and with-driver totals on the same vehicle. The price changed as soon as the dates did.',
  },
  {
    name: 'Liza Mercado',
    trip: 'Bayombong errand',
    quote: 'I could see which units were already reserved. That made it easy to pick another return date.',
  },
]

export const SERVICES = [
  { title: 'Self-Drive', body: 'Take the wheel for errands, events, and provincial trips.', icon: 'steering' },
  { title: 'With Driver', body: 'Add a professional driver when you would rather ride.', icon: 'user' },
  { title: 'Family & Group', body: 'MPVs and vans for relatives, guests, and team travel.', icon: 'users' },
  { title: 'Pickup & Utility', body: 'Pickups for cargo, farm runs, and out-of-town hauls.', icon: 'truck' },
]
