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

/** Printed rental agreement (Nehemiah / Cadiang-style). */
export const RENTAL_AGREEMENT_COMPANY = {
  legalName: 'NEHEMIAH SALES AND SERVICES CORPORATION',
  tradeName: 'Drive Moko Car Rentals',
  address: 'San Nicolas North, Bayombong, Nueva Vizcaya, Philippines',
  contact: '0926-7764-015',
  authorizedRepresentative: '',
  authorizedRepLicenseId: '',
}

export const RENTAL_AGREEMENT_CLAUSES = [
  'The security deposit shall be refunded after vehicle inspection, subject to deductions for damages, missing items, traffic violations, tolls, or unpaid charges.',
  'The vehicle shall be used for personal and lawful purposes only.',
  'Late returns shall be charged at PHP 300 per hour/day, at the discretion of NEHEMIAH SALES AND SERVICES CORPORATION.',
  'Vehicle must be returned with the same fuel level. Fuel shortages will be charged accordingly.',
  'The vehicle is released in good running and roadworthy condition. The Renter agrees to return the vehicle in the same condition, normal wear and tear excepted.',
  'The vehicle shall not be used for racing, illegal activities, off-road use, or sub-renting.',
  'Only the Renter or approved drivers authorized by NEHEMIAH SALES AND SERVICES CORPORATION may operate the vehicle (with-driver rentals: the assigned professional driver operates the vehicle).',
  'The Renter must possess a valid Philippine driver\'s license (or valid foreign license where applicable) when operating the vehicle.',
  'Vehicle is released with FULL fuel level unless otherwise agreed in writing at handover.',
  'Any mechanical problem, warning light, or unusual noise must be reported immediately to NEHEMIAH SALES AND SERVICES CORPORATION.',
  'The Renter shall be fully responsible for any damage, loss, or theft during the rental period.',
  'In case of accident, damage, or theft, the Renter must immediately notify NEHEMIAH SALES AND SERVICES CORPORATION and the appropriate authorities (PNP / Traffic Office).',
  'If the vehicle is damaged and the repair is covered by insurance, the Renter agrees to continue paying the daily rental rate for the entire downtime period, including time for insurance processing and repairs.',
  'If the vehicle is repaired outside of insurance coverage, the Renter shall be responsible for all repair and related costs, and daily rental charges for the full downtime period until the vehicle is fully repaired and ready.',
  'Downtime rental charges shall be based on the agreed daily rental rate stated in this Agreement. Any insurance deductible, participation fee, or uninsured loss shall be paid by the Renter.',
  'The Renter is solely responsible for all traffic violations, fines, penalties, towing fees, and legal liabilities incurred during the rental period.',
  'Drive Moko Car Rentals / NEHEMIAH SALES AND SERVICES CORPORATION reserves the right to terminate this Agreement immediately without prior notice if the Renter violates any term or condition herein.',
  'This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines.',
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
    a: 'Partners (Links) earn 70% of each booking total. Drive Moko keeps 30% as the company share on completed partner-vehicle rentals.',
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
