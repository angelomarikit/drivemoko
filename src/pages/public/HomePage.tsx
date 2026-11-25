import * as Accordion from '@radix-ui/react-accordion'
import { CalendarDays, CarFront, ChevronDown, CircleCheck, MapPin, Search, Shield, Star, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { VehicleImage } from '@/components/common/VehicleImage'
import { Button } from '@/components/ui/Button'
import { RentalFulfillmentPicker } from '@/components/rentals/RentalFulfillmentPicker'
import { DateField } from '@/components/ui/Fields'
import type { FulfillmentMode } from '@/constants/pickup'
import { BRAND, FAQS, SERVICES, TESTIMONIALS } from '@/constants/content'
import { useSnapshot } from '@/hooks/useDemo'
import { formatPeso } from '@/utils/money'
import { formatRentalPriceRange, resolveRentalPackage } from '@/utils/rentalPackage'

function HeroMessage({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#04111f]/92 p-4 text-white shadow-lg lg:p-5">
      <h1 className="text-[clamp(1.45rem,2.5vw,2.9rem)] font-black italic leading-[0.95] tracking-tight">
        Susi Mo Sa
        <span className="mt-1 block text-gold">Masayang Biyahe!</span>
      </h1>
      <div className="mt-2 h-1.5 w-24 -skew-x-12 rounded-full bg-gold" />
      <p className="mt-3 max-w-md text-sm text-white/90">Rent a car in Nueva Vizcaya — for business, family trips, or everyday travel.</p>
      <div className={compact ? 'mt-3 hidden flex-wrap gap-x-3 gap-y-2 text-xs font-semibold min-[1100px]:flex [@media(max-height:760px)]:hidden' : 'mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold'}>
        <span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-ink"><CarFront className="h-3.5 w-3.5" /></span>Self-Drive or With Driver</span>
        <span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-ink"><Users className="h-3.5 w-3.5" /></span>Wide Selection of Vehicles</span>
        <span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-ink"><CalendarDays className="h-3.5 w-3.5" /></span>Easy Online Booking</span>
      </div>
    </div>
  )
}

export function HomePage() {
  const { data } = useSnapshot()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [rentalType, setRentalType] = useState<'self-drive' | 'with-driver'>('self-drive')
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('delivery')
  const [pickup, setPickup] = useState('')
  const [ret, setRet] = useState('')
  const featured = (data?.vehicles ?? []).filter((vehicle) => vehicle.listingStatus === 'approved').slice(0, 4)

  const search = () => {
    const params = new URLSearchParams({ type: rentalType, fulfillment: fulfillmentMode })
    if (pickup) params.set('pickup', pickup)
    if (ret) params.set('return', ret)
    navigate(`/cars?${params.toString()}`)
  }

  return (
    <div>
      <section className="relative flex min-h-[calc(100dvh-78px)] w-full flex-col overflow-hidden bg-navy">
        <img
          src="/hero-banner.jpg"
          alt="Drive Moko fleet on a mountain road in Nueva Vizcaya"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[42%_48%] sm:object-[50%_50%] lg:object-[55%_52%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04111f]/88 via-[#04111f]/35 to-transparent lg:via-[#04111f]/15" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071833] via-[#071833]/55 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 pt-5 pb-3 sm:px-6 lg:px-8 lg:pt-8">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md lg:absolute lg:left-[max(1rem,5%)] lg:top-1/2 lg:w-[min(22rem,38vw)] lg:-translate-y-1/2 xl:max-w-xl"
          >
            <HeroMessage compact />
          </motion.div>
          <div className="flex-1 min-h-4 lg:min-h-0" aria-hidden />
        </div>

        <div className="relative z-20 mx-auto w-full max-w-5xl shrink-0 px-4 pb-5 pt-2 sm:px-6 lg:pb-7">
          <div className="flex">
            <button type="button" onClick={() => setRentalType('self-drive')} className={`inline-flex items-center gap-2 rounded-t-2xl px-4 py-2.5 text-sm font-bold sm:px-6 sm:py-3 ${rentalType === 'self-drive' ? 'bg-gold text-ink' : 'bg-navy text-white'}`}>
              <CarFront className="h-4 w-4" /> Rent a Car
            </button>
            <button type="button" onClick={() => setRentalType('with-driver')} className={`inline-flex items-center gap-2 rounded-t-2xl px-4 py-2.5 text-sm font-bold sm:px-6 sm:py-3 ${rentalType === 'with-driver' ? 'bg-gold text-ink' : 'bg-[#10233d] text-white'}`}>
              <Users className="h-4 w-4" /> With Driver
            </button>
          </div>
          <div className="grid gap-3 rounded-b-3xl rounded-tr-3xl bg-white p-4 shadow-[0_20px_50px_rgba(7,24,51,0.12)]">
            <RentalFulfillmentPicker mode={fulfillmentMode} onModeChange={setFulfillmentMode} suggestDelivery compact />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <DateField label="Pickup Date" value={pickup} onChange={setPickup} disablePast />
              <DateField label="Return Date" value={ret} onChange={setRet} disablePast />
              <Button className="h-11 sm:col-span-2 lg:col-span-1" onClick={search}>
                <Search className="h-4 w-4" /> Search Cars
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-16">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold tracking-[0.2em] text-gold">HOW IT WORKS</p>
          <h2 className="mt-1 text-3xl font-extrabold">How to Rent a Car</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Search & Choose', 'Find the right vehicle for your needs.', Search],
            ['Book Online', 'Select your dates and reservation details.', CalendarDays],
            ['Get Confirmed', 'Receive your booking confirmation.', CircleCheck],
            ['Drive & Enjoy', 'Pick up the car and enjoy your trip!', CarFront],
          ].map(([title, body, Icon], index) => (
            <div key={String(title)} className="relative rounded-2xl bg-white p-5 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-gold-2">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-4 font-bold">{index + 1}. {title as string}</p>
              <p className="mt-1 text-sm text-muted">{body as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-canvas py-16">
        <div className="mx-auto max-w-[1440px] px-4">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-3xl font-extrabold">Featured Vehicles</h2>
            <Link to="/cars" className="text-sm font-bold text-navy">View all</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((vehicle) => {
              const pkg = data ? resolveRentalPackage(vehicle, data.settings) : null
              return (
              <article key={vehicle.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <VehicleImage src={vehicle.images[0]} alt={vehicle.name} className="h-40 w-full" />
                <div className="p-4">
                  <h3 className="font-bold">{vehicle.name}</h3>
                  <p className="mt-1 text-sm text-muted">{vehicle.seats} Seater · {vehicle.transmission}</p>
                  <p className="mt-2 font-extrabold text-gold-2">
                    {pkg ? formatRentalPriceRange(pkg, formatPeso) : formatPeso(vehicle.pricePerDay)}{' '}
                    <span className="text-xs font-semibold text-muted">/ day</span>
                  </p>
                  <Button className="mt-3 w-full" onClick={() => navigate(`/cars/${vehicle.id}`)}>View Details</Button>
                </div>
              </article>
            )})}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-16 md:grid-cols-4">
        {SERVICES.map((service) => (
          <div key={service.title} className="rounded-2xl border border-line p-5">
            <Shield className="h-6 w-6 text-gold-2" />
            <h3 className="mt-3 font-bold">{service.title}</h3>
            <p className="mt-1 text-sm text-muted">{service.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-navy py-14 text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-extrabold">Why choose {BRAND.name}?</h2>
            <p className="mt-2 max-w-xl text-white/75">Local trips around Nueva Vizcaya, a clear booking path, and partner vehicles managed from one operations desk.</p>
          </div>
          <Link to="/become-a-partner" className="rounded-full bg-gold px-5 py-3 text-sm font-bold text-ink">Become a Partner</Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold">Customer stories</h2>
        <p className="mb-6 text-center text-sm text-muted">Customer reviews appear when published for each vehicle.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <figure key={item.name} className="rounded-2xl border border-line p-5">
              <div className="flex gap-1 text-gold-2">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div>
              <blockquote className="mt-3 text-sm leading-6">{item.quote}</blockquote>
              <figcaption className="mt-4 text-sm font-bold">{item.name}<span className="block font-medium text-muted">{item.trip}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-canvas py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-4 text-center text-3xl font-extrabold">Frequently asked questions</h2>
          <Accordion.Root type="single" collapsible className="space-y-2">
            {FAQS.map((faq) => (
              <Accordion.Item key={faq.q} value={faq.q} className="overflow-hidden rounded-2xl bg-white">
                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold">
                    {faq.q}
                    <ChevronDown className="h-4 w-4" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="px-4 pb-4 text-sm leading-6 text-muted">{faq.a}</Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>
    </div>
  )
}
