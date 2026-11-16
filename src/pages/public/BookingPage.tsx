import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, Check, Shield, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { VehicleImage } from '@/components/common/VehicleImage'
import { Button } from '@/components/ui/Button'
import { DateField, ErrorText, FieldLabel, SelectInput, TextArea, TextInput } from '@/components/ui/Fields'
import { useDemoActions, useSession, useSnapshot } from '@/hooks/useDemo'
import type { Booking, BookingAddons, RentalType } from '@/types'
import { scheduleIssues } from '@/utils/bookingRules'
import { addDays, formatPretty, formatTime, manilaYmd } from '@/utils/dates'
import { formatPeso } from '@/utils/money'
import { ADDON_RATES, quote } from '@/utils/pricing'
import { homeForRole } from '@/utils/bookingRules'
import { dayAvailability, vehicleDayMap } from '@/utils/vehicleAvailability'

const customerSchema = z.object({
  name: z.string().min(2, 'Enter the renter name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a contact number'),
  address: z.string().min(4, 'Enter an address'),
  licenseNumber: z.string().optional(),
  emergencyName: z.string().min(2, 'Enter an emergency contact'),
  emergencyPhone: z.string().min(10, 'Enter an emergency number'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Accept the rental terms' }) }),
  demoConsent: z.literal(true, { errorMap: () => ({ message: 'Confirm this is demo data only' }) }),
})

type CustomerForm = z.infer<typeof customerSchema>

const steps = ['Rental Details', 'Your Information', 'Review & Confirm', 'Booking Complete']

export function BookingPage() {
  const { vehicleId } = useParams()
  const [params] = useSearchParams()
  const { data } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const navigate = useNavigate()
  const vehicle = data?.vehicles.find((item) => item.id === vehicleId)
  const [step, setStep] = useState(0)
  const [location, setLocation] = useState(params.get('location') || 'Nueva Vizcaya')
  const [pickup, setPickup] = useState(params.get('pickup') || addDays(manilaYmd(), 6))
  const [ret, setRet] = useState(params.get('return') || addDays(manilaYmd(), 8))
  const [pickupTime, setPickupTime] = useState('08:00')
  const [returnTime, setReturnTime] = useState('18:00')
  const [rentalType, setRentalType] = useState<RentalType>(params.get('type') === 'with-driver' ? 'with-driver' : 'self-drive')
  const [addons, setAddons] = useState<BookingAddons>({ insurance: false, withDriver: false, childSeat: false })
  const [request, setRequest] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [preview, setPreview] = useState('')
  const [done, setDone] = useState<Booking | null>(null)
  const [scheduleError, setScheduleError] = useState('')
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: session?.role === 'customer' ? session.name : '',
      email: session?.role === 'customer' ? session.email : '',
      phone: session?.role === 'customer' ? session.phone : '',
      address: session?.role === 'customer' ? session.address : '',
      licenseNumber: session?.licenseNumber ?? '',
      emergencyName: session?.emergencyName ?? '',
      emergencyPhone: session?.emergencyPhone ?? '',
      terms: undefined,
      demoConsent: undefined,
    },
  })

  if (!vehicle || !data) {
    return <div className="p-16 text-center">Vehicle not found. <Link to="/cars">Browse cars</Link></div>
  }

  const pricing = quote(vehicle.pricePerDay, pickup, ret, rentalType === 'with-driver' || addons.withDriver ? 'with-driver' : rentalType, addons)
  const rentalDayMap = vehicleDayMap(vehicle.id, data)
  const blockRentalDay = (ymd: string) => {
    const tone = dayAvailability(ymd, rentalDayMap)
    return tone === 'booked' || tone === 'pending' || tone === 'maintenance'
  }

  const next = () => {
    const issues = scheduleIssues({ vehicleId: vehicle.id, pickupDate: pickup, returnDate: ret, pickupTime, returnTime, rentalType }, data)
    if (issues.length) {
      setScheduleError(issues[0])
      return
    }
    if (rentalType === 'self-drive' && !vehicle.offeredRentalTypes.includes('self-drive')) {
      setScheduleError('Self-drive is not offered for this vehicle.')
      return
    }
    setScheduleError('')
    setStep(1)
  }

  const submitInfo = form.handleSubmit((values) => {
    if (rentalType === 'self-drive' && !values.licenseNumber?.trim()) {
      form.setError('licenseNumber', { message: 'A license number is required for self-drive' })
      return
    }
    setStep(2)
  })

  const confirm = async () => {
    const values = form.getValues()
    const booking = await actions.createBooking({
      vehicleId: vehicle.id,
      customerId: session?.role === 'customer' ? session.id : undefined,
      customer: values,
      pickupLocation: location,
      pickupDate: pickup,
      returnDate: ret,
      pickupTime,
      returnTime,
      rentalType,
      addons,
      specialRequest: request,
      documentName: documentName || undefined,
    })
    if (booking) {
      setDone(booking)
      setStep(3)
    }
  }

  return (
    <div className="bg-canvas pb-16">
      <section className="relative h-44 overflow-hidden bg-navy text-white">
        <img src="/hero-banner.jpg" alt="" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/70 to-transparent" />
        <div className="absolute inset-0 mx-auto flex max-w-5xl items-center px-4">
          <div>
            <h1 className="text-4xl font-extrabold italic">Book a Car</h1>
            <p className="text-sm text-white/80">Reserve your vehicle in just a few steps.</p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4">
        <ol className="my-6 grid grid-cols-4 gap-2 text-center text-xs font-bold sm:text-sm">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-col items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-full ${index <= step ? 'bg-gold text-ink' : 'bg-slate-200 text-slate-500'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>
              <span className={index === step ? 'text-ink' : 'text-muted'}>{label}</span>
            </li>
          ))}
        </ol>
        {step < 3 ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              {step === 0 ? (
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold"><CalendarDays className="h-5 w-5" /> Rental Details</h2>
                  <p className="text-sm text-muted">Select your rental schedule and preferences.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <label><FieldLabel required>Pickup Location</FieldLabel><SelectInput value={location} onChange={(event) => setLocation(event.target.value)}>{data.settings.locations.map((item) => <option key={item}>{item}</option>)}</SelectInput></label>
                    <DateField label="Pickup Date" value={pickup} onChange={setPickup} required disablePast isDateDisabled={blockRentalDay} />
                    <DateField label="Return Date" value={ret} onChange={setRet} required disablePast isDateDisabled={blockRentalDay} />
                    <label><FieldLabel required>Rental Type</FieldLabel><SelectInput value={rentalType} onChange={(event) => setRentalType(event.target.value as RentalType)}>{vehicle.offeredRentalTypes.map((type) => <option key={type} value={type}>{type === 'self-drive' ? 'Self-Drive' : 'With Driver'}</option>)}</SelectInput></label>
                    <label><FieldLabel required>Pickup Time</FieldLabel><TextInput type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} /></label>
                    <label><FieldLabel required>Return Time</FieldLabel><TextInput type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} /></label>
                  </div>
                  <h3 className="mt-5 font-bold">Add-ons (Optional)</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Addon checked={addons.insurance} title="Additional Insurance" body={`+${formatPeso(ADDON_RATES.insurance)} / day`} onChange={(checked) => setAddons({ ...addons, insurance: checked })} />
                    <Addon checked={addons.withDriver || rentalType === 'with-driver'} title="With Driver" body={`+${formatPeso(ADDON_RATES.withDriver)} / day`} onChange={(checked) => { setAddons({ ...addons, withDriver: checked }); if (checked) setRentalType('with-driver') }} />
                    <Addon checked={addons.childSeat} title="Child Seat" body={`+${formatPeso(ADDON_RATES.childSeat)} / day`} onChange={(checked) => setAddons({ ...addons, childSeat: checked })} />
                  </div>
                  <label className="mt-4 block"><FieldLabel>Special Request (Optional)</FieldLabel><TextArea maxLength={500} value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Pickup notes or other requests" /></label>
                  <p className="text-right text-xs text-muted">{request.length} / 500</p>
                  <ErrorText>{scheduleError}</ErrorText>
                </div>
              ) : null}
              {step === 1 ? (
                <form id="customer-form" onSubmit={submitInfo} className="grid gap-3 md:grid-cols-2">
                  <h2 className="flex items-center gap-2 text-lg font-bold md:col-span-2"><UserRound className="h-5 w-5" /> Your Information</h2>
                  <label><FieldLabel required>Full Name</FieldLabel><TextInput {...form.register('name')} /></label>
                  <label><FieldLabel required>Email</FieldLabel><TextInput type="email" {...form.register('email')} /></label>
                  <label><FieldLabel required>Contact Number</FieldLabel><TextInput {...form.register('phone')} placeholder="09XX XXX XXXX" /></label>
                  <label><FieldLabel required>Address</FieldLabel><TextInput {...form.register('address')} /></label>
                  <label><FieldLabel required={rentalType === 'self-drive'}>Driver's License</FieldLabel><TextInput {...form.register('licenseNumber')} placeholder="License number only" /></label>
                  <label><FieldLabel>License preview</FieldLabel><TextInput type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; setDocumentName(file?.name ?? ''); if (file) setPreview(URL.createObjectURL(file)) }} /></label>
                  <p className="text-xs text-muted md:col-span-2">The file stays in this browser preview. It is not uploaded.</p>
                  {preview ? <img src={preview} alt="Local license preview" className="h-24 rounded-xl object-cover md:col-span-2" /> : null}
                  <label><FieldLabel required>Emergency Contact</FieldLabel><TextInput {...form.register('emergencyName')} /></label>
                  <label><FieldLabel required>Emergency Number</FieldLabel><TextInput {...form.register('emergencyPhone')} /></label>
                  <label className="flex items-start gap-2 text-sm md:col-span-2"><input type="checkbox" {...form.register('terms')} /> I agree to the demonstration rental terms.</label>
                  <label className="flex items-start gap-2 text-sm md:col-span-2"><input type="checkbox" {...form.register('demoConsent')} /> I understand no identity document or payment will be stored or sent.</label>
                  <div className="md:col-span-2">{Object.values(form.formState.errors).map((error) => <ErrorText key={error?.message}>{error?.message}</ErrorText>)}</div>
                </form>
              ) : null}
              {step === 2 ? (
                <div className="space-y-3 text-sm">
                  <h2 className="text-lg font-bold">Review & Confirm</h2>
                  <p><strong>{vehicle.name}</strong> · {form.getValues('name')} · {form.getValues('email')}</p>
                  <p>{location} · {formatPretty(pickup)} {formatTime(pickupTime)} to {formatPretty(ret)} {formatTime(returnTime)}</p>
                  <p>{rentalType === 'self-drive' ? 'Self-Drive' : 'With Driver'} · {formatPeso(pricing.total)}</p>
                  {request ? <p>Request: {request}</p> : null}
                  <p className="rounded-xl bg-sky-50 p-3 text-sky-800">Your booking will stay Pending until an administrator confirms it.</p>
                </div>
              ) : null}
              <div className="mt-5 flex justify-between">
                <Button variant="outline" onClick={() => (step === 0 ? navigate('/cars') : setStep((value) => value - 1))}><ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Back to Cars' : 'Back'}</Button>
                {step === 0 ? <Button onClick={next}>Continue to Your Information <ArrowRight className="h-4 w-4" /></Button> : null}
                {step === 1 ? <Button type="submit" form="customer-form">Review & Confirm <ArrowRight className="h-4 w-4" /></Button> : null}
                {step === 2 ? <Button onClick={confirm}>Confirm Booking</Button> : null}
              </div>
            </div>
            <Summary vehicleName={vehicle.name} meta={`${vehicle.category} · ${vehicle.seats} Seater · ${vehicle.transmission} · ${vehicle.fuel}`} image={vehicle.images[0]} rentalType={rentalType} pickup={pickup} ret={ret} pricing={pricing} />
          </div>
        ) : done ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-success"><Check /></span>
            <h2 className="mt-3 text-2xl font-extrabold">Booking received</h2>
            <p className="mt-1 text-sm text-muted">Reference <strong>{done.reference}</strong> · status Pending</p>
            <div className="mx-auto mt-4 max-w-md space-y-1 text-sm">
              <p>{vehicle.name}</p>
              <p>{formatPretty(done.pickupDate)} – {formatPretty(done.returnDate)}</p>
              <p className="font-bold">{formatPeso(done.pricing.total)}</p>
            </div>
            <p className="mt-3 text-sm text-muted">Next: an administrator reviews availability. Nothing is charged in this demo.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate('/cars')}>Browse cars</Button>
              <Button
                onClick={async () => {
                  if (session?.role === 'customer') navigate('/customer/bookings')
                  else if (session) navigate(homeForRole(session.role))
                  else if (done) {
                    await actions.login(done.customerId)
                    navigate('/customer/bookings')
                  } else navigate('/login')
                }}
              >
                View My Bookings
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Addon({ checked, title, body, onChange }: { checked: boolean; title: string; body: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-2xl border p-3 text-sm">
      <span><span className="flex items-center gap-1 font-bold"><Shield className="h-4 w-4 text-gold-2" /> {title}</span><span className="text-muted">{body}</span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function Summary({ vehicleName, meta, image, rentalType, pickup, ret, pricing }: { vehicleName: string; meta: string; image?: string; rentalType: RentalType; pickup: string; ret: string; pricing: ReturnType<typeof quote> }) {
  return (
    <aside className="h-fit rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">Booking Summary</h2>
      <div className="mt-3 flex gap-3">
        <VehicleImage src={image} alt="" className="h-16 w-20 rounded-xl" />
        <div>
          <p className="font-bold">{vehicleName}</p>
          <p className="text-xs text-muted">{meta}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold"><CarFront className="h-3 w-3" /> {rentalType === 'self-drive' ? 'Self-Drive' : 'With Driver'}</span>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3"><span className="text-muted">Rental Period</span><span className="text-right font-semibold">{formatPretty(pickup)} – {formatPretty(ret)} ({pricing.days} days)</span></div>
        <div className="flex justify-between"><span className="text-muted">Rental Rate</span><span>{formatPeso(pricing.dailyRate)} / day</span></div>
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPeso(pricing.base)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Add-ons</span><span>{formatPeso(pricing.total - pricing.base)}</span></div>
        <div className="flex justify-between rounded-xl bg-amber-50 px-3 py-2 font-extrabold"><span>Total Rental Amount</span><span>{formatPeso(pricing.total)}</span></div>
      </div>
      <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Your booking will be subject to admin confirmation. We will notify you via the demo inbox once the reservation is approved. No real SMS is sent.</p>
    </aside>
  )
}
