import { DEFAULT_INCLUSIONS } from '@/constants/content'
import type {
  Booking,
  BookingStatus,
  DemoData,
  Payment,
  PaymentMethod,
  RentalType,
  SmsTemplate,
  User,
  Vehicle,
} from '@/types'
import { addDays, manilaYmd, rangesOverlap } from '@/utils/dates'
import { emptyAddons, quotePackage } from '@/utils/pricing'
import { DEFAULT_RENTAL_PACKAGE, resolveRentalPackage } from '@/utils/rentalPackage'

function mulberry32(seed: number) {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let next = Math.imul(value ^ (value >>> 15), 1 | value)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

const inclusions = DEFAULT_INCLUSIONS

function fleetVehicle(input: Vehicle): Vehicle {
  return input
}

type SeedBookingInput = {
  id: string
  reference: string
  vehicleId: string
  customerId: string
  pickupDate: string
  returnDate: string
  status: BookingStatus
  payment: 'verified' | 'pending' | 'rejected' | 'none'
  pickupTime?: string
  returnTime?: string
  location?: string
  rentalType?: RentalType
  method?: PaymentMethod
}

function seedUsers(): User[] {
  return [
    user('user-admin', 'admin', 'Admin', 'admin@drivemoko.demo', '0900-000-0001', 'System Administrator', '2026-06-01'),
    user('user-partner', 'partner', 'Nehemiah Sales', 'partner@drivemoko.demo', '0900-000-0002', 'Partner (Link)', '2026-07-01', 'Solano, Nueva Vizcaya', 70),
    user('user-maria', 'customer', 'Maria Santos', 'customer@drivemoko.demo', '0900-000-0004', 'Customer', '2026-10-20', 'Solano, Nueva Vizcaya', undefined, 'N01-24-000441'),
    user('user-juan', 'customer', 'Juan Dela Cruz', 'juan@drivemoko.demo', '0900-000-0005', 'Customer', '2026-08-01', 'Bambang, Nueva Vizcaya'),
    user('user-reynald', 'customer', 'Reynald Paraíso', 'reynald@drivemoko.demo', '0900-000-0006', 'Customer', '2026-10-28', 'Bayombong, Nueva Vizcaya'),
    user('user-allan', 'customer', 'Allan Amenemen', 'allan@drivemoko.demo', '0900-000-0007', 'Customer', '2026-09-01', 'Bagabag, Nueva Vizcaya'),
    user('user-nella', 'customer', 'Nella Vanguardia', 'nella@drivemoko.demo', '0900-000-0008', 'Customer', '2026-10-02', 'Aritao, Nueva Vizcaya'),
    user('user-paolo', 'customer', 'Paolo Ramos', 'paolo@drivemoko.demo', '0900-000-0009', 'Customer', '2026-08-15', 'Quezon, Nueva Vizcaya'),
    user('user-liza', 'customer', 'Liza Mercado', 'liza@drivemoko.demo', '0900-000-0010', 'Customer', '2026-11-01', 'Diadi, Nueva Vizcaya'),
  ]
}

function seedVehicles(): Vehicle[] {
  return [
    fleetVehicle({
      id: 'v-fortuner',
      name: 'Toyota Fortuner',
      brand: 'Toyota',
      model: 'Fortuner',
      year: 2024,
      category: 'SUV',
      seats: 7,
      transmission: 'Automatic',
      fuel: 'Diesel',
      pricePerDay: 3499,
      rentalPackage: { rateFirstDay: 3499, rateSucceeding: 2499, rate10Days: 2199, rate15Plus: 1999 },
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: 'user-partner',
      images: ['/vehicles/fortuner.jpg', '/vehicles/interior.jpg', '/vehicles/cabin.jpg', '/vehicles/mountains.jpg'],
      description: 'A spacious, powerful, and reliable SUV for family trips, business travel, or long drives around Nueva Vizcaya and nearby provinces.',
      features: ['7 Seater', 'Automatic', 'Diesel', 'Airconditioning', 'Reverse Camera', 'Bluetooth', 'USB Charging', 'Insurance Included'],
      inclusions,
      plateNumber: 'NV 5501',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-03T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-vios',
      name: 'Toyota Vios',
      brand: 'Toyota',
      model: 'Vios',
      year: 2023,
      category: 'Sedan',
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Gasoline',
      pricePerDay: 2500,
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: 'user-partner',
      images: ['/vehicles/vios.jpg', '/vehicles/cabin.jpg', '/vehicles/interior.jpg'],
      description: 'A light, efficient sedan for city errands and short provincial drives. Demonstration listing.',
      features: ['5 Seater', 'Automatic', 'Gasoline', 'Airconditioning', 'Bluetooth', 'USB Charging'],
      inclusions,
      plateNumber: 'NV 2502',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-04T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-xpander',
      name: 'Mitsubishi Xpander',
      brand: 'Mitsubishi',
      model: 'Xpander',
      year: 2024,
      category: 'MPV',
      seats: 7,
      transmission: 'Automatic',
      fuel: 'Gasoline',
      pricePerDay: 4000,
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: 'user-partner',
      images: ['/vehicles/xpander.jpg', '/vehicles/interior.jpg', '/vehicles/cabin.jpg'],
      description: 'A seven-seat MPV for family outings and airport runs around Nueva Vizcaya. Demonstration listing.',
      features: ['7 Seater', 'Automatic', 'Gasoline', 'Airconditioning', 'Rear Camera', 'Bluetooth'],
      inclusions,
      plateNumber: 'NV 4003',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-05T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-hiace',
      name: 'Toyota Hiace',
      brand: 'Toyota',
      model: 'Hiace',
      year: 2022,
      category: 'Van',
      seats: 12,
      transmission: 'Manual',
      fuel: 'Diesel',
      pricePerDay: 6500,
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: 'user-partner',
      images: ['/vehicles/hiace.jpg', '/vehicles/interior.jpg', '/vehicles/mountains.jpg'],
      description: 'A twelve-seat van for groups, events, and out-of-town travel. Demonstration listing.',
      features: ['12 Seater', 'Manual', 'Diesel', 'Airconditioning', 'Large Cargo Space'],
      inclusions,
      plateNumber: 'NV 6504',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-06T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-raize',
      name: 'Toyota Raize',
      brand: 'Toyota',
      model: 'Raize',
      year: 2024,
      category: 'SUV',
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Gasoline',
      pricePerDay: 3500,
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: null,
      images: ['/vehicles/raize.jpg', '/vehicles/cabin.jpg', '/vehicles/mountains.jpg'],
      description: 'A compact crossover for daily drives and light provincial trips. Company fleet demo unit.',
      features: ['5 Seater', 'Automatic', 'Gasoline', 'Airconditioning', 'Bluetooth'],
      inclusions,
      plateNumber: 'NV 3505',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-07T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-avanza',
      name: 'Toyota Avanza',
      brand: 'Toyota',
      model: 'Avanza',
      year: 2023,
      category: 'MPV',
      seats: 7,
      transmission: 'Automatic',
      fuel: 'Gasoline',
      pricePerDay: 3800,
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: null,
      images: ['/vehicles/avanza.jpg', '/vehicles/interior.jpg', '/vehicles/cabin.jpg'],
      description: 'A practical seven-seat MPV for family weekends. Company fleet demo unit.',
      features: ['7 Seater', 'Automatic', 'Gasoline', 'Airconditioning', 'USB Charging'],
      inclusions,
      plateNumber: 'NV 3806',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-08T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-navara',
      name: 'Nissan Navara',
      brand: 'Nissan',
      model: 'Navara',
      year: 2023,
      category: 'Pickup',
      seats: 5,
      transmission: 'Manual',
      fuel: 'Diesel',
      pricePerDay: 6000,
      listingStatus: 'approved',
      listingActive: false,
      ownerId: null,
      partnerId: null,
      images: ['/vehicles/navara.jpg', '/vehicles/mountains.jpg', '/vehicles/cabin.jpg'],
      description: 'A diesel pickup currently held from the public listing. Demonstration unit.',
      features: ['5 Seater', 'Manual', 'Diesel', 'Airconditioning', 'Bed Liner'],
      inclusions,
      plateNumber: 'NV 6007',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-06-09T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-dmax',
      name: 'Isuzu D-Max',
      brand: 'Isuzu',
      model: 'D-Max',
      year: 2024,
      category: 'Pickup',
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Diesel',
      pricePerDay: 5800,
      listingStatus: 'approved',
      listingActive: true,
      ownerId: null,
      partnerId: null,
      images: ['/vehicles/dmax.jpg', '/vehicles/mountains.jpg', '/vehicles/interior.jpg'],
      description: 'An automatic diesel pickup for cargo and provincial travel. Self-drive demo listing.',
      features: ['5 Seater', 'Automatic', 'Diesel', 'Airconditioning', 'Reverse Camera'],
      inclusions,
      plateNumber: 'NV 5808',
      offeredRentalTypes: ['self-drive'],
      airconditioning: true,
      createdAt: '2026-06-10T00:00:00.000Z',
    }),
    fleetVehicle({
      id: 'v-wigo',
      name: 'Toyota Wigo',
      brand: 'Toyota',
      model: 'Wigo',
      year: 2022,
      category: 'Sedan',
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Gasoline',
      pricePerDay: 2200,
      listingStatus: 'pending',
      listingActive: false,
      ownerId: null,
      partnerId: 'user-partner',
      images: ['/vehicles/avanza.jpg', '/vehicles/cabin.jpg'],
      description: 'Partner-submitted city car waiting for administrator approval. Demonstration listing.',
      features: ['5 Seater', 'Automatic', 'Gasoline', 'Airconditioning'],
      inclusions,
      plateNumber: 'NV 2209',
      offeredRentalTypes: ['self-drive', 'with-driver'],
      airconditioning: true,
      createdAt: '2026-11-10T00:00:00.000Z',
    }),
  ]
}

function seedMaintenance(today: string) {
  return [
    {
      id: 'mnt-hiace',
      vehicleId: 'v-hiace',
      startDate: addDays(today, -1),
      endDate: addDays(today, 3),
      reason: 'Scheduled maintenance',
      createdBy: 'user-admin',
    },
  ]
}

function seedSmsTemplates(): SmsTemplate[] {
  return [
    { id: 'sms-confirm', key: 'confirmation', name: 'Booking confirmation', body: 'Drive Moko: Hi {name}, booking {reference} for {vehicle} is confirmed. Pickup {pickup}. This is a simulated message.' },
    { id: 'sms-cancel', key: 'cancellation', name: 'Booking cancellation', body: 'Drive Moko: Hi {name}, booking {reference} for {vehicle} was cancelled. This is a simulated message.' },
    { id: 'sms-remind', key: 'rental_reminder', name: 'Rental reminder', body: 'Drive Moko: Reminder for {name}. {vehicle} ({reference}) picks up on {pickup}. Simulated message.' },
    { id: 'sms-return', key: 'return_reminder', name: 'Return reminder', body: 'Drive Moko: Hi {name}, please return {vehicle} ({reference}) on {return}. Simulated message.' },
    { id: 'sms-custom', key: 'custom', name: 'Custom notice', body: 'Drive Moko: {message}' },
  ]
}

function seedSettings() {
  return {
    holdPendingBookings: true,
    companyCommissionRate: 0,
    defaultPartnerShare: 70,
    defaultPartnerFixedShare: { rateFirstDay: 2000, rateSucceeding: 1500, rate10Days: 1300, rate15Plus: 1200 },
    defaultDriverPackage: { insidePerDay: 1000, outsideFirstDay: 3000, outsideSucceeding: 1000 },
    securityDepositAmount: 3000,
    ownersCanBlockAvailability: true,
    smsSenderName: 'Drive Moko',
    locations: [
      'Nueva Vizcaya',
      'Bayombong',
      'Solano',
      'Bambang',
      'Bagabag',
      'Diadi',
      'Quezon',
      'Aritao',
      'Dupax del Sur',
      'Kasibu',
      'Santa Fe',
      'Outside Nueva Vizcaya',
    ],
    defaultRentalPackage: { ...DEFAULT_RENTAL_PACKAGE },
  }
}

function seedApplications() {
  return [
    {
      id: 'app-anna',
      fullName: 'Anna Reyes',
      phone: '0900-000-0021',
      email: 'anna.reyes@drivemoko.demo',
      address: 'Bambang, Nueva Vizcaya',
      vehicleDetails: '2021 Toyota Innova, 7 seater, automatic',
      ownershipType: 'owned' as const,
      vehicleCount: 1,
      notes: 'Available on weekdays. Demo application.',
      status: 'pending' as const,
      createdAt: '2026-11-09T03:00:00.000Z',
    },
  ]
}

function minimalReviews() {
  return [
    review('rev-1', 'v-fortuner', 'Maria Santos', 5, 'Smooth ride and the quote matched the booking summary.'),
    review('rev-2', 'v-fortuner', 'Paolo Ramos', 5, 'Spacious for a family weekend. Demo review.'),
    review('rev-3', 'v-fortuner', 'Liza Mercado', 4, 'Easy to reserve once the dates were open.'),
  ]
}

function fullReviews() {
  return [
    ...minimalReviews(),
    review('rev-4', 'v-vios', 'Allan Amenemen', 5, 'Light on fuel for town errands. Demo review.'),
    review('rev-5', 'v-vios', 'Nella Vanguardia', 4, 'Simple sedan, clear pickup instructions.'),
    review('rev-6', 'v-xpander', 'Reynald Paraíso', 5, 'Comfortable third row for the kids.'),
    review('rev-7', 'v-hiace', 'Juan Dela Cruz', 4, 'Good for a big group. Demo review.'),
    review('rev-8', 'v-raize', 'Maria Santos', 5, 'Easy to park in Solano.'),
    review('rev-9', 'v-avanza', 'Liza Mercado', 4, 'Practical people hauler.'),
    review('rev-10', 'v-dmax', 'Nella Vanguardia', 5, 'Handled the provincial road well.'),
  ]
}

function buildCoreSeed() {
  return {
    users: seedUsers(),
    vehicles: seedVehicles(),
    maintenance: [] as ReturnType<typeof seedMaintenance>,
    applications: seedApplications(),
    smsTemplates: seedSmsTemplates(),
    settings: seedSettings(),
  }
}

function appendSeedBooking(
  vehicles: Vehicle[],
  bookings: Booking[],
  payments: Payment[],
  seedBooking: SeedBookingInput,
) {
    const vehicle = vehicles.find((item) => item.id === seedBooking.vehicleId)!
    const rentalType = seedBooking.rentalType ?? 'self-drive'
    const pricing = quotePackage(
      resolveRentalPackage(vehicle, seedSettings()),
      seedBooking.pickupDate,
      seedBooking.returnDate,
      rentalType,
      emptyAddons(),
      undefined,
      undefined,
      seedSettings().securityDepositAmount,
    )
    const createdAt = `${seedBooking.pickupDate}T01:00:00.000Z`
    const history = [{ id: `${seedBooking.id}-h1`, at: createdAt, action: 'Booking request created', by: 'System' }]
    if (seedBooking.status === 'confirmed' || seedBooking.status === 'ongoing' || seedBooking.status === 'completed') {
      history.push({ id: `${seedBooking.id}-h2`, at: createdAt, action: 'Booking confirmed', by: 'Admin' })
    }
    if (seedBooking.status === 'ongoing' || seedBooking.status === 'completed') {
      history.push({ id: `${seedBooking.id}-h3`, at: `${seedBooking.pickupDate}T08:00:00.000Z`, action: 'Vehicle released', by: 'Admin' })
    }
    if (seedBooking.status === 'completed') {
      history.push({ id: `${seedBooking.id}-h4`, at: `${seedBooking.returnDate}T18:00:00.000Z`, action: 'Vehicle returned', by: 'Admin' })
    }
    if (seedBooking.status === 'cancelled') history.push({ id: `${seedBooking.id}-hx`, at: createdAt, action: 'Booking cancelled', by: 'Admin' })
    if (seedBooking.status === 'rejected') history.push({ id: `${seedBooking.id}-hx`, at: createdAt, action: 'Booking rejected', by: 'Admin' })
    const booking: Booking = {
      id: seedBooking.id,
      reference: seedBooking.reference,
      vehicleId: seedBooking.vehicleId,
      customerId: seedBooking.customerId,
      pickupLocation: seedBooking.location ?? 'Nueva Vizcaya',
      pickupDate: seedBooking.pickupDate,
      returnDate: seedBooking.returnDate,
      pickupTime: seedBooking.pickupTime ?? '08:00',
      returnTime: seedBooking.returnTime ?? '18:00',
      rentalType,
      addons: emptyAddons(),
      specialRequest: '',
      status: seedBooking.status,
      paymentStatus: seedBooking.payment === 'verified' ? 'paid' : seedBooking.payment === 'pending' ? 'pending' : seedBooking.payment === 'rejected' ? 'rejected' : 'unpaid',
      pricing,
      notes: '',
      history,
      createdAt,
    }
    bookings.push(booking)
    if (seedBooking.payment !== 'none') {
      payments.push({
        id: `pay-${seedBooking.id}`,
        bookingId: booking.id,
        amount: pricing.total,
        method: seedBooking.method ?? 'cash',
        status: seedBooking.payment === 'verified' ? 'verified' : seedBooking.payment,
        reference: `DEMO-${seedBooking.reference}`,
        note: seedBooking.payment === 'verified' ? 'Demo payment verified' : 'Demo payment awaiting review',
        recordedBy: 'user-admin',
        createdAt,
      })
    }
}

function buildFullBookings(today: string, vehicles: Vehicle[], maintenance: ReturnType<typeof seedMaintenance>) {
  const bookings: Booking[] = []
  const payments: Payment[] = []
  const push = (input: SeedBookingInput) => appendSeedBooking(vehicles, bookings, payments, input)

  push({ id: 'b-0098', reference: 'DM-2026-0098', vehicleId: 'v-vios', customerId: 'user-paolo', pickupDate: addDays(today, -45), returnDate: addDays(today, -43), status: 'cancelled', payment: 'rejected', method: 'gcash' })
  push({ id: 'b-0099', reference: 'DM-2026-0099', vehicleId: 'v-xpander', customerId: 'user-liza', pickupDate: addDays(today, -40), returnDate: addDays(today, -38), status: 'rejected', payment: 'none' })
  push({ id: 'b-0139', reference: 'DM-2026-0139', vehicleId: 'v-avanza', customerId: 'user-liza', pickupDate: today, returnDate: addDays(today, 3), status: 'ongoing', payment: 'verified', method: 'maya', location: 'Bayombong' })
  push({ id: 'b-0140', reference: 'DM-2026-0140', vehicleId: 'v-raize', customerId: 'user-paolo', pickupDate: today, returnDate: addDays(today, 2), status: 'ongoing', payment: 'verified', method: 'cash', location: 'Solano' })
  push({ id: 'b-0141', reference: 'DM-2026-0141', vehicleId: 'v-dmax', customerId: 'user-nella', pickupDate: addDays(today, -5), returnDate: addDays(today, -3), status: 'completed', payment: 'verified', method: 'bank', location: 'Aritao' })
  push({ id: 'b-0142', reference: 'DM-2026-0142', vehicleId: 'v-hiace', customerId: 'user-allan', pickupDate: addDays(today, 5), returnDate: addDays(today, 6), status: 'confirmed', payment: 'none', location: 'Bagabag' })
  push({ id: 'b-0143', reference: 'DM-2026-0143', vehicleId: 'v-xpander', customerId: 'user-reynald', pickupDate: addDays(today, 2), returnDate: addDays(today, 4), status: 'pending', payment: 'none', location: 'Bayombong' })
  push({ id: 'b-0144', reference: 'DM-2026-0144', vehicleId: 'v-vios', customerId: 'user-maria', pickupDate: addDays(today, 1), returnDate: addDays(today, 3), status: 'confirmed', payment: 'pending', method: 'gcash', location: 'Solano' })
  push({ id: 'b-0145', reference: 'DM-2026-0145', vehicleId: 'v-fortuner', customerId: 'user-juan', pickupDate: today, returnDate: addDays(today, 2), status: 'ongoing', payment: 'verified', method: 'cash', pickupTime: '08:00', returnTime: '18:00', location: 'Nueva Vizcaya' })

  const customers = ['user-maria', 'user-juan', 'user-reynald', 'user-allan', 'user-nella', 'user-paolo', 'user-liza']
  const locations = ['Nueva Vizcaya', 'Bayombong', 'Solano', 'Bambang', 'Bagabag']
  const methods: PaymentMethod[] = ['cash', 'gcash', 'maya', 'bank']
  let seq = 100
  let customerIndex = 0
  const historyEnd = addDays(today, -8)
  vehicles
    .filter((vehicle) => vehicle.listingStatus === 'approved')
    .forEach((vehicle) => {
      const random = mulberry32(vehicle.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0))
      let cursor = addDays(today, -55)
      while (cursor < historyEnd && seq <= 138) {
        const days = random() > 0.5 ? 2 : 3
        const end = addDays(cursor, days)
        const blocked = bookings.some(
          (booking) =>
            booking.vehicleId === vehicle.id &&
            booking.status !== 'cancelled' &&
            booking.status !== 'rejected' &&
            rangesOverlap(cursor, end, booking.pickupDate, booking.returnDate),
        ) || maintenance.some((window) => window.vehicleId === vehicle.id && rangesOverlap(cursor, end, window.startDate, addDays(window.endDate, 1)))
        if (blocked || end > addDays(today, -7)) {
          cursor = addDays(cursor, 1)
          continue
        }
        const reference = `DM-2026-${String(seq).padStart(4, '0')}`
        push({
          id: `b-${seq}`,
          reference,
          vehicleId: vehicle.id,
          customerId: customers[customerIndex % customers.length],
          pickupDate: cursor,
          returnDate: end,
          status: 'completed',
          payment: 'verified',
          method: methods[seq % methods.length],
          location: locations[seq % locations.length],
        })
        customerIndex += 1
        seq += 1
        cursor = addDays(end, 4)
      }
    })

  return { bookings, payments, bookingSeq: 146 }
}

export function createMinimalSeed(): DemoData {
  const core = buildCoreSeed()
  return {
    ...core,
    bookings: [],
    payments: [],
    favorites: [],
    notifications: [
      note('ntf-welcome', 'user-admin', 'Walkthrough demo ready', 'No sample bookings yet. Create rentals from the public site or admin desk, then approve them here.', '/admin/bookings'),
      note('ntf-partner-app', 'user-admin', 'Partner application', 'Anna Reyes submitted a partner application.', '/admin/partners'),
      note('ntf-wigo', 'user-admin', 'Vehicle awaiting approval', 'Review the pending Toyota Wigo listing.', '/admin/vehicles'),
    ],
    inquiries: [],
    reviews: minimalReviews(),
    smsLogs: [],
    partnerDisbursements: [],
    sessionUserId: null,
    bookingSeq: 100,
    version: 1,
  }
}

export function createFullSeed(): DemoData {
  const today = manilaYmd()
  const core = buildCoreSeed()
  const maintenance = seedMaintenance(today)
  const { bookings, payments, bookingSeq } = buildFullBookings(today, core.vehicles, maintenance)
  return {
    ...core,
    maintenance,
    bookings,
    payments,
    favorites: [
      { userId: 'user-maria', vehicleId: 'v-fortuner' },
      { userId: 'user-maria', vehicleId: 'v-raize' },
    ],
    notifications: [
      note('ntf-1', 'user-admin', 'Pending booking', 'Reynald Paraíso requested the Mitsubishi Xpander.', '/admin/bookings'),
      note('ntf-2', 'user-admin', 'Partner application', 'Anna Reyes submitted a partner application.', '/admin/partners'),
      note('ntf-3', 'user-admin', 'Vehicle awaiting approval', 'Nehemiah Sales submitted a Toyota Wigo.', '/admin/vehicles'),
      note('ntf-4', 'user-maria', 'Booking confirmed', 'Your Toyota Vios rental DM-2026-0144 is confirmed.', '/customer/bookings'),
      note('ntf-5', 'user-partner', 'Vehicle on rental', 'Toyota Fortuner is out with DM-2026-0145.', '/partner/reservations'),
      note('ntf-6', 'user-partner', 'Share recorded', 'Fortuner rental DM-2026-0145 is ongoing.', '/partner/reservations'),
      note('ntf-7', 'user-juan', 'Rental started', 'Your Fortuner rental is marked ongoing.', '/customer/bookings'),
    ],
    inquiries: [
      {
        id: 'inq-1',
        name: 'Carlo Domingo',
        email: 'carlo@drivemoko.demo',
        phone: '0900-000-0033',
        message: 'Do you have a self-drive van for a Saturday group trip? Demo inquiry.',
        createdAt: `${today}T04:00:00.000Z`,
      },
    ],
    reviews: fullReviews(),
    smsLogs: [
      {
        id: 'smslog-1',
        to: '0900-000-0005',
        templateId: 'sms-confirm',
        body: 'Simulated confirmation for DM-2026-0145 Toyota Fortuner.',
        status: 'simulated',
        createdAt: `${today}T02:00:00.000Z`,
        bookingId: 'b-0145',
      },
    ],
    partnerDisbursements: [],
    sessionUserId: null,
    bookingSeq,
    version: 1,
  }
}

/** Default seed for new sessions and reset: empty booking history for walkthroughs. */
export function createSeed(): DemoData {
  return createMinimalSeed()
}

function user(
  id: string,
  role: User['role'],
  name: string,
  email: string,
  phone: string,
  title: string,
  createdOn: string,
  address = 'Nueva Vizcaya',
  shareRate?: number,
  licenseNumber?: string,
): User {
  return {
    id,
    role,
    name,
    email,
    phone,
    address,
    title,
    status: 'active',
    shareRate,
    licenseNumber,
    createdAt: `${createdOn}T00:00:00.000Z`,
  }
}

function note(id: string, userId: string, title: string, body: string, href: string) {
  return { id, userId, title, body, read: false, createdAt: '2026-11-12T01:00:00.000Z', href }
}

function review(id: string, vehicleId: string, author: string, rating: number, comment: string) {
  return { id, vehicleId, author, rating, comment, createdAt: '2026-10-15T00:00:00.000Z' }
}
