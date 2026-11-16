import * as Tabs from '@radix-ui/react-tabs'
import { ChevronLeft, ChevronRight, Heart, MapPin, MessageSquare, Share2, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '@/components/common/StatusBadge'
import { VehicleAvailabilityCalendar } from '@/components/vehicles/VehicleAvailabilityCalendar'
import { VehicleAvailabilityModal } from '@/components/vehicles/VehicleAvailabilityModal'
import { VehicleImage } from '@/components/common/VehicleImage'
import { Button } from '@/components/ui/Button'
import { DateField, SelectInput } from '@/components/ui/Fields'
import { Modal } from '@/components/ui/Modal'
import { RENTAL_TERMS, REQUIREMENTS } from '@/constants/content'
import { useDemoActions, useSession, useSnapshot } from '@/hooks/useDemo'
import { addDays, manilaYmd } from '@/utils/dates'
import { isPubliclyBookable, scheduleIssues } from '@/utils/bookingRules'
import { formatPretty } from '@/utils/dates'
import { formatPeso } from '@/utils/money'
import { emptyAddons, quote } from '@/utils/pricing'
import { dayAvailability, vehicleDayMap } from '@/utils/vehicleAvailability'
import { toast } from 'sonner'

export function VehicleDetailPage() {
  const { vehicleId } = useParams()
  const [params] = useSearchParams()
  const { data } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const navigate = useNavigate()
  const vehicle = data?.vehicles.find((item) => item.id === vehicleId)
  const reviews = (data?.reviews ?? []).filter((review) => review.vehicleId === vehicleId)
  const rating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  const [index, setIndex] = useState(0)
  const [gallery, setGallery] = useState(false)
  const [location, setLocation] = useState(params.get('location') || 'Nueva Vizcaya')
  const [pickup, setPickup] = useState(params.get('pickup') || addDays(manilaYmd(), 6))
  const [ret, setRet] = useState(params.get('return') || addDays(manilaYmd(), 8))
  const [rentalType, setRentalType] = useState<'self-drive' | 'with-driver'>(params.get('type') === 'with-driver' ? 'with-driver' : 'self-drive')
  const [ask, setAsk] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [message, setMessage] = useState('I would like to ask about this vehicle.')

  const pricing = vehicle ? quote(vehicle.pricePerDay, pickup, ret, rentalType, emptyAddons()) : null
  const rentalDayMap = vehicle && data ? vehicleDayMap(vehicle.id, data) : null
  const blockRentalDay = (ymd: string) => {
    if (!rentalDayMap) return false
    const tone = dayAvailability(ymd, rentalDayMap)
    return tone === 'booked' || tone === 'pending' || tone === 'maintenance'
  }
  const issues = useMemo(() => {
    if (!vehicle || !data) return []
    return scheduleIssues({ vehicleId: vehicle.id, pickupDate: pickup, returnDate: ret, pickupTime: '08:00', returnTime: '18:00', rentalType }, data)
  }, [data, pickup, rentalType, ret, vehicle])

  if (!vehicle || !pricing) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><p className="font-bold">Vehicle not found</p><Link to="/cars" className="mt-3 inline-block text-sm font-bold">Back to cars</Link></div>
  }

  const bookable = isPubliclyBookable(vehicle)
  const loved = (data?.favorites ?? []).some((favorite) => favorite.vehicleId === vehicle.id && favorite.userId === (session?.id ?? 'guest'))
  const images = vehicle.images.length ? vehicle.images : ['']

  const book = () => {
    if (!bookable || issues.length) {
      toast.error(issues[0] ?? 'This vehicle cannot be booked.')
      return
    }
    const next = new URLSearchParams({ location, pickup, return: ret, type: rentalType })
    navigate(`/book/${vehicle.id}?${next.toString()}`)
  }

  return (
    <div className="bg-canvas pb-16">
      <div className="mx-auto max-w-[1440px] px-4 py-5">
        <p className="mb-4 text-sm text-muted"><Link to="/" className="font-semibold text-ink">Home</Link> <span>/</span> <Link to="/cars">Available Cars</Link> <span>/</span> {vehicle.name}</p>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr_320px]">
          <div>
            <div className="relative overflow-hidden rounded-3xl bg-white">
              <VehicleImage src={images[index]} alt={`Demo photo of ${vehicle.name}`} className="h-[340px] w-full cursor-zoom-in" />
              <button type="button" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white shadow" onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)} aria-label="Previous photo"><ChevronLeft /></button>
              <button type="button" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white shadow" onClick={() => setIndex((value) => (value + 1) % images.length)} aria-label="Next photo"><ChevronRight /></button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">{index + 1}/{images.length}</span>
              <span className="absolute left-3 top-3"><StatusBadge value={bookable ? 'available' : 'unavailable'} /></span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((image, imageIndex) => (
                <button key={image + imageIndex} type="button" onClick={() => { setIndex(imageIndex); setGallery(true) }} className={`overflow-hidden rounded-xl border-2 ${imageIndex === index ? 'border-gold' : 'border-transparent'}`}>
                  <VehicleImage src={image} alt="" className="h-16 w-full" />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold">{vehicle.name}</h1>
                <p className="mt-1 text-sm text-muted">{vehicle.category} · {vehicle.seats} Seater · {vehicle.transmission} · {vehicle.fuel}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full border" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied') }} aria-label="Share"><Share2 className="h-4 w-4" /></button>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full border" onClick={() => actions.favorite(vehicle.id)} aria-label="Favorite"><Heart className={`h-4 w-4 ${loved ? 'fill-rose-500 text-rose-500' : ''}`} /></button>
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-[#f59e0b]">{formatPeso(vehicle.pricePerDay)} <span className="text-sm font-semibold text-muted">/ day</span></p>
            <p className="mt-1 flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-gold text-gold" /> {rating.toFixed(1)} ({reviews.length} reviews)</p>
            <p className="mt-3 text-sm leading-6 text-muted">{vehicle.description}</p>
            <h2 className="mt-5 font-bold">Vehicle Specifications</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {vehicle.features.map((feature) => <div key={feature} className="rounded-xl bg-canvas px-2 py-3 text-center text-xs font-semibold">{feature}</div>)}
            </div>
            <div className="mt-5 rounded-2xl bg-amber-50 p-4">
              <p className="font-bold">Inclusions</p>
              <ul className="mt-2 space-y-1 text-sm">{vehicle.inclusions.map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
            <div className="mt-5 rounded-2xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-bold">Rental availability</h2>
                <button type="button" className="text-xs font-bold text-info" onClick={() => setAvailabilityOpen(true)}>
                  Full calendar
                </button>
              </div>
              <p className="mb-3 text-xs text-muted">Dates already reserved or blocked for maintenance cannot be selected in the booking form.</p>
              <VehicleAvailabilityCalendar vehicleId={vehicle.id} compact />
            </div>
          </div>
          <aside className="h-fit rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Book This Car</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-semibold">Pickup Location
                <span className="mt-1 flex items-center gap-2"><MapPin className="h-4 w-4 text-muted" />
                  <SelectInput value={location} onChange={(event) => setLocation(event.target.value)}>{data?.settings.locations.map((item) => <option key={item}>{item}</option>)}</SelectInput>
                </span>
              </label>
              <DateField label="Pickup Date" value={pickup} onChange={setPickup} disablePast isDateDisabled={blockRentalDay} />
              <DateField label="Return Date" value={ret} onChange={setRet} disablePast isDateDisabled={blockRentalDay} />
              <label className="block text-sm font-semibold">Rental Type
                <SelectInput className="mt-1" value={rentalType} onChange={(event) => setRentalType(event.target.value as 'self-drive' | 'with-driver')}>
                  {vehicle.offeredRentalTypes.map((type) => <option key={type} value={type}>{type === 'self-drive' ? 'Self-Drive' : 'With Driver'}</option>)}
                </SelectInput>
              </label>
              <div className="rounded-xl border text-sm">
                <Row label="Rental Rate" value={`${formatPeso(vehicle.pricePerDay)} / day`} />
                <Row label="No. of Days" value={`${pricing.days} days`} />
                <Row label="Subtotal" value={formatPeso(pricing.base)} />
                {pricing.driver ? <Row label="Driver" value={formatPeso(pricing.driver)} /> : null}
                <div className="flex justify-between bg-amber-50 px-3 py-2 font-extrabold"><span>Total Rental</span><span>{formatPeso(pricing.total)}</span></div>
              </div>
              {issues[0] ? <p className="text-xs font-medium text-danger">{issues[0]}</p> : <p className="text-xs text-muted">{formatPretty(pickup)} – {formatPretty(ret)}</p>}
              <button type="button" className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-info" onClick={() => setAvailabilityOpen(true)}>
                View availability calendar
              </button>
              <Button className="w-full" disabled={!bookable} onClick={book}>Book Now</Button>
              <Button variant="outline" className="w-full" onClick={() => setAsk(true)}><MessageSquare className="h-4 w-4" /> Inquire Now</Button>
            </div>
          </aside>
        </div>
        <Tabs.Root defaultValue="description" className="mt-6 rounded-3xl bg-white p-4">
          <Tabs.List className="flex gap-2 overflow-x-auto border-b">
            {[['description', 'Description'], ['terms', 'Rental Terms'], ['requirements', 'Requirements'], ['reviews', `Reviews (${reviews.length})`]].map(([value, label]) => (
              <Tabs.Trigger key={value} value={value} className="border-b-2 border-transparent px-4 py-3 text-sm font-bold text-muted data-[state=active]:border-gold data-[state=active]:text-ink">{label}</Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="description" className="py-4 text-sm leading-6">
            <h3 className="font-bold">About This Vehicle</h3>
            <p className="mt-2 text-muted">{vehicle.description} Demonstration rate {formatPeso(vehicle.pricePerDay)} per day. Plate {vehicle.plateNumber}.</p>
          </Tabs.Content>
          <Tabs.Content value="terms" className="space-y-2 py-4 text-sm text-muted">{RENTAL_TERMS.map((term) => <p key={term}>{term}</p>)}</Tabs.Content>
          <Tabs.Content value="requirements" className="grid gap-3 py-4 md:grid-cols-2">{REQUIREMENTS.map((item) => <div key={item.title} className="rounded-2xl bg-canvas p-4"><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-muted">{item.body}</p></div>)}</Tabs.Content>
          <Tabs.Content value="reviews" className="space-y-3 py-4">{reviews.map((review) => <div key={review.id} className="rounded-2xl border p-3"><p className="font-bold">{review.author} · {review.rating}/5</p><p className="text-sm text-muted">{review.comment}</p></div>)}{reviews.length === 0 ? <p className="text-sm text-muted">No demo reviews yet.</p> : null}</Tabs.Content>
        </Tabs.Root>
      </div>
      <Modal open={gallery} onClose={() => setGallery(false)} title={vehicle.name} wide>
        <VehicleImage src={images[index]} alt={`Demo photo of ${vehicle.name}`} className="max-h-[70vh] w-full rounded-xl" />
      </Modal>
      <VehicleAvailabilityModal vehicle={vehicle} open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />
      <Modal open={ask} onClose={() => setAsk(false)} title="Inquire about this vehicle">
        <textarea className="min-h-28 w-full rounded-xl border p-3 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} />
        <Button className="mt-3" onClick={() => actions.inquiry({ name: session?.name ?? 'Website visitor', email: session?.email ?? 'visitor@drivemoko.demo', phone: session?.phone ?? '0900-000-0000', message, vehicleId: vehicle.id }).then(() => setAsk(false))}>Send inquiry</Button>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b px-3 py-2"><span className="text-muted">{label}</span><span className="font-semibold">{value}</span></div>
}
