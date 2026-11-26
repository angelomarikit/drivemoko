import { zodResolver } from '@hookform/resolvers/zod'
import * as Popover from '@radix-ui/react-popover'
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, Check, Info, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { VehicleImage } from '@/components/common/VehicleImage'
import { Button } from '@/components/ui/Button'
import { FileUploadButton } from '@/components/ui/FileUploadButton'
import { DateField, ErrorText, FieldLabel, SelectInput, TextArea, TextInput } from '@/components/ui/Fields'
import { useDemoActions, useSession, useSnapshot } from '@/hooks/useDemo'
import type { Booking, RentalType } from '@/types'
import { scheduleIssues } from '@/utils/bookingRules'
import { addDays, formatPretty, formatTime, manilaYmd } from '@/utils/dates'
import { formatPeso } from '@/utils/money'
import { DriverPackageRates } from '@/components/rentals/DriverPackageRates'
import { RentalFulfillmentPicker } from '@/components/rentals/RentalFulfillmentPicker'
import { RentalPackageRates } from '@/components/rentals/RentalPackageRates'
import { BookingReviewStep } from '@/components/rentals/BookingReviewStep'
import { RentalContractModal } from '@/components/rentals/RentalContractModal'
import { SecurityDepositSummary } from '@/components/rentals/SecurityDepositSummary'
import type { RentalContractData } from '@/utils/rentalContract'
import {
  buildPickupLocation,
  type FulfillmentMode,
} from '@/constants/pickup'
import { quoteDriverFee, type DriverServiceZone } from '@/utils/driverPackage'
import { emptyAddons, quotePackage } from '@/utils/pricing'
import { resolveRentalPackage } from '@/utils/rentalPackage'
import { dayAvailability, vehicleDayMap } from '@/utils/vehicleAvailability'
import { cn } from '@/utils/cn'
import { findVehicleByParam, isUuid, resolveVehicleForBooking } from '@/utils/vehicleParam'
import { friendlyErrorMessage } from '@/utils/friendlyError'

const RENTER_DOC_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

type RenterDocSlot = 'license' | 'validId' | 'proofOfBilling'

type PickedRenterDoc = { file: File; preview?: string }

const customerSchema = z.object({
  name: z.string().min(2, 'Enter the renter name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  phone: z.string().min(10, 'Enter a contact number'),
  address: z.string().min(4, 'Enter an address'),
  licenseNumber: z.string().optional(),
  emergencyName: z.string().min(2, 'Enter an emergency contact'),
  emergencyPhone: z.string().min(10, 'Enter an emergency number'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Accept the rental terms' }) }),
})

type CustomerForm = z.infer<typeof customerSchema>

const steps = ['Rental Details', 'Your Information', 'Review & Confirm', 'Booking Complete']

export function BookingPage() {
  const { vehicleId } = useParams()
  const [params] = useSearchParams()
  const { data, refetch } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const navigate = useNavigate()
  const vehicle = useMemo(() => {
    if (!data || !vehicleId) return undefined
    try {
      return resolveVehicleForBooking(data.vehicles, vehicleId)
    } catch {
      return findVehicleByParam(data.vehicles, vehicleId)
    }
  }, [data, vehicleId])
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!vehicle || !vehicleId || !isUuid(vehicle.id) || vehicle.id === vehicleId) return
    const next = new URLSearchParams(params)
    navigate(`/book/${vehicle.id}?${next.toString()}`, { replace: true })
  }, [navigate, params, vehicle, vehicleId])
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>(
    params.get('fulfillment') === 'office' ? 'office' : 'delivery',
  )
  const [pickup, setPickup] = useState(params.get('pickup') || addDays(manilaYmd(), 6))
  const [ret, setRet] = useState(params.get('return') || addDays(manilaYmd(), 8))
  const [pickupTime, setPickupTime] = useState('08:00')
  const [returnTime, setReturnTime] = useState('18:00')
  const [withDriver, setWithDriver] = useState(params.get('type') === 'with-driver')
  const [driverZone, setDriverZone] = useState<DriverServiceZone>(
    params.get('driverZone') === 'outside' ? 'outside' : 'inside',
  )
  const [request, setRequest] = useState('')
  const [renterDocs, setRenterDocs] = useState<Partial<Record<RenterDocSlot, PickedRenterDoc>>>({})
  const [renterDocError, setRenterDocError] = useState('')
  const [done, setDone] = useState<Booking | null>(null)
  const [scheduleError, setScheduleError] = useState('')
  const [contractOpen, setContractOpen] = useState(false)
  const [contractDraft, setContractDraft] = useState<RentalContractData | null>(null)
  const bookingAsGuest = !session || session.role !== 'customer'

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: session?.role === 'customer' ? session.name : '',
      email: session?.role === 'customer' ? session.email : '',
      password: '',
      confirmPassword: '',
      phone: session?.role === 'customer' ? session.phone : '',
      address: session?.role === 'customer' ? session.address : '',
      licenseNumber: session?.licenseNumber ?? '',
      emergencyName: session?.emergencyName ?? '',
      emergencyPhone: session?.emergencyPhone ?? '',
      terms: undefined,
    },
  })

  if (!vehicle || !data) {
    return <div className="p-16 text-center">Vehicle not found. <Link to="/cars">Browse cars</Link></div>
  }

  const rentalType: RentalType = withDriver ? 'with-driver' : 'self-drive'
  const pickupLocation = buildPickupLocation(fulfillmentMode)
  const isFirstTimeRenter =
    !session ||
    session.role !== 'customer' ||
    !data.bookings.some(
      (booking) => booking.customerId === session.id && !['cancelled', 'rejected'].includes(booking.status),
    )
  const rentalRates = resolveRentalPackage(vehicle, data.settings)
  const pricing = quotePackage(
    rentalRates,
    pickup,
    ret,
    rentalType,
    emptyAddons(),
    driverZone,
    data.settings.defaultDriverPackage,
    data.settings.securityDepositAmount,
  )
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
    setScheduleError('')
    setStep(1)
  }

  const pickRenterDoc = (slot: RenterDocSlot, file: File) => {
    setRenterDocs((current) => {
      const oldPreview = current[slot]?.preview
      if (oldPreview) URL.revokeObjectURL(oldPreview)
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      return { ...current, [slot]: { file, preview } }
    })
    setRenterDocError('')
  }

  const submitInfo = form.handleSubmit((values) => {
    if (bookingAsGuest) {
      const password = values.password?.trim() ?? ''
      if (password.length < 8) {
        form.setError('password', { message: 'Use at least 8 characters for your password.' })
        return
      }
      if (password !== (values.confirmPassword?.trim() ?? '')) {
        form.setError('confirmPassword', { message: 'Passwords do not match.' })
        return
      }
    }
    if (!withDriver && !values.licenseNumber?.trim()) {
      form.setError('licenseNumber', { message: 'A license number is required for self-drive' })
      return
    }
    const missing: string[] = []
    if (!renterDocs.license) missing.push("driver's license photo")
    if (!renterDocs.validId) missing.push('valid ID')
    if (!renterDocs.proofOfBilling) missing.push('proof of billing or barangay clearance')
    if (missing.length) {
      setRenterDocError(`Please upload: ${missing.join(', ')}.`)
      return
    }
    setRenterDocError('')
    setStep(2)
  })

  const [confirming, setConfirming] = useState(false)

  const confirm = async () => {
    if (!contractDraft || confirming) return
    const values = form.getValues()
    const missing: string[] = []
    if (!renterDocs.license) missing.push("driver's license photo")
    if (!renterDocs.validId) missing.push('valid ID')
    if (!renterDocs.proofOfBilling) missing.push('proof of billing or barangay clearance')
    if (missing.length) {
      setRenterDocError(`Please upload: ${missing.join(', ')}.`)
      setStep(1)
      return
    }
    const fresh = (await refetch()).data ?? data
    const clash = scheduleIssues(
      {
        vehicleId: vehicle.id,
        pickupDate: pickup,
        returnDate: ret,
        pickupTime,
        returnTime,
        rentalType,
        customerId: session?.role === 'customer' ? session.id : undefined,
      },
      fresh,
    )
    if (clash.length) {
      setScheduleError(clash[0])
      setStep(0)
      return
    }
    setConfirming(true)
    setScheduleError('')
    try {
    const booking = await actions.createBooking({
      vehicleId: vehicleId ?? vehicle.id,
      customerId: session?.role === 'customer' ? session.id : undefined,
      customer: {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        licenseNumber: values.licenseNumber,
        emergencyName: values.emergencyName,
        emergencyPhone: values.emergencyPhone,
        password: bookingAsGuest ? values.password?.trim() : undefined,
      },
      pickupLocation,
      pickupDate: pickup,
      returnDate: ret,
      pickupTime,
      returnTime,
      rentalType,
      driverZone: withDriver ? driverZone : undefined,
      addons: emptyAddons(),
      specialRequest: request,
      renterDocuments: {
        license: renterDocs.license?.file,
        validId: renterDocs.validId?.file,
        proofOfBilling: renterDocs.proofOfBilling?.file,
      },
      contract: contractDraft,
    })
    if (booking) {
      setDone(booking)
      setStep(3)
    }
    } catch (error) {
      const msg = friendlyErrorMessage(error, 'booking')
      if (/dates are no longer|overlap|not available for this vehicle/i.test(msg)) {
        setScheduleError(msg)
        setStep(0)
      }
    } finally {
      setConfirming(false)
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
        {session && session.role !== 'customer' ? (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            You are signed in as <strong>{session.role}</strong>. Public checkout is for <strong>customers</strong> only — sign out and use guest
            checkout, or add a booking in the dashboard under <strong>Bookings</strong>.
          </p>
        ) : null}
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
                  <div className="mt-4 space-y-3">
                    <RentalFulfillmentPicker
                      mode={fulfillmentMode}
                      onModeChange={setFulfillmentMode}
                      suggestDelivery={isFirstTimeRenter}
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <DateField label="Pickup Date" value={pickup} onChange={setPickup} required disablePast isDateDisabled={blockRentalDay} />
                      <DateField label="Return Date" value={ret} onChange={setRet} required disablePast isDateDisabled={blockRentalDay} />
                      <label><FieldLabel required>Pickup Time</FieldLabel><TextInput type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} /></label>
                      <label><FieldLabel required>Return Time</FieldLabel><TextInput type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} /></label>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <RentalPackageRates package={rentalRates} compact />
                    <DriverPackageRates
                      driverZone={driverZone}
                      onDriverZoneChange={setDriverZone}
                      withDriver={withDriver}
                      onWithDriverChange={setWithDriver}
                      days={pricing.days}
                      package={data.settings.defaultDriverPackage}
                      compact
                    />
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
                  {bookingAsGuest ? (
                    <>
                      <label className="md:col-span-2">
                        <FieldLabel required>Password</FieldLabel>
                        <TextInput
                          type="password"
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          {...form.register('password')}
                        />
                        <p className="mt-1 text-xs text-muted">
                          After you confirm, we&apos;ll email these login details so you can track your booking (you won&apos;t stay signed in on this page).
                        </p>
                      </label>
                      <label className="md:col-span-2">
                        <FieldLabel required>Confirm password</FieldLabel>
                        <TextInput type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
                      </label>
                    </>
                  ) : null}
                  <label><FieldLabel required>Contact Number</FieldLabel><TextInput {...form.register('phone')} placeholder="09XX XXX XXXX" /></label>
                  <label>
                    <FieldLabel required>{fulfillmentMode === 'delivery' ? 'Delivery address' : 'Address'}</FieldLabel>
                    <TextInput
                      {...form.register('address')}
                      placeholder={fulfillmentMode === 'delivery' ? 'Street, barangay, municipality' : 'Your address'}
                    />
                  </label>
                  <label><FieldLabel required={!withDriver}>Driver&apos;s License #</FieldLabel><TextInput {...form.register('licenseNumber')} placeholder="License number" /></label>
                  <label className="md:col-span-2">
                    <FieldLabel required>Verification documents</FieldLabel>
                    <p className="mt-0.5 text-xs text-muted">
                      Upload clear photos or PDF scans (JPEG, PNG, WebP, or PDF). Files are stored with your booking for admin review.
                    </p>
                  </label>
                  <RenterDocumentUpload
                    className="md:col-span-2"
                    label="Driver's license"
                    required
                    picked={renterDocs.license}
                    onPick={(file) => pickRenterDoc('license', file)}
                  />
                  <RenterDocumentUpload
                    className="md:col-span-2"
                    label="Valid ID (renter)"
                    required
                    picked={renterDocs.validId}
                    onPick={(file) => pickRenterDoc('validId', file)}
                  />
                  <RenterDocumentUpload
                    className="md:col-span-2"
                    label="Proof of billing or barangay clearance"
                    labelInfo="The bill or clearance should be in the renter's name. If it is in another person's name, also upload a copy of that person's valid ID."
                    required
                    picked={renterDocs.proofOfBilling}
                    onPick={(file) => pickRenterDoc('proofOfBilling', file)}
                  />
                  {renterDocError ? <div className="md:col-span-2"><ErrorText>{renterDocError}</ErrorText></div> : null}
                  <label><FieldLabel required>Emergency Contact</FieldLabel><TextInput {...form.register('emergencyName')} /></label>
                  <label><FieldLabel required>Emergency Number</FieldLabel><TextInput {...form.register('emergencyPhone')} /></label>
                  <label className="flex items-start gap-2 text-sm md:col-span-2"><input type="checkbox" {...form.register('terms')} /> I agree to the rental terms and conditions.</label>
                  <div className="md:col-span-2">{Object.values(form.formState.errors).map((error) => <ErrorText key={error?.message}>{error?.message}</ErrorText>)}</div>
                </form>
              ) : null}
              {step === 2 ? (
                <BookingReviewStep
                  vehicleName={vehicle.name}
                  vehicleMeta={`${vehicle.category} · ${vehicle.seats} Seater · ${vehicle.transmission}`}
                  vehicleImage={vehicle.images[0]}
                  rentalType={rentalType}
                  withDriver={withDriver}
                  driverZoneLabel={withDriver ? (driverZone === 'outside' ? 'Outside province' : 'Inside province') : undefined}
                  pickupLocation={pickupLocation}
                  pickupDate={pickup}
                  returnDate={ret}
                  pickupTime={pickupTime}
                  returnTime={returnTime}
                  renter={{
                    name: form.getValues('name'),
                    email: form.getValues('email'),
                    phone: form.getValues('phone'),
                    address: form.getValues('address'),
                  }}
                  pricing={pricing}
                  specialRequest={request}
                  contractSignedAt={contractDraft?.signedAtIso}
                  onOpenContract={() => setContractOpen(true)}
                />
              ) : null}
              {step === 2 ? (
                <RentalContractModal
                  open={contractOpen}
                  onClose={() => setContractOpen(false)}
                  vehicleName={vehicle.name}
                  vehicleMeta={`${vehicle.category} · ${vehicle.seats} Seater · ${vehicle.transmission}`}
                  rentalType={rentalType}
                  withDriver={withDriver}
                  driverZoneLabel={withDriver ? (driverZone === 'outside' ? 'Outside province' : 'Inside province') : undefined}
                  pickupLocation={pickupLocation}
                  pickupDate={pickup}
                  returnDate={ret}
                  pickupTime={pickupTime}
                  returnTime={returnTime}
                  renterName={form.getValues('name')}
                  renterEmail={form.getValues('email')}
                  renterPhone={form.getValues('phone')}
                  renterAddress={form.getValues('address')}
                  pricing={pricing}
                  specialRequest={request}
                  onSigned={({ signatureDataUrl, signedAtIso, signerName }) => {
                    setContractDraft({
                      vehicleName: vehicle.name,
                      vehicleMeta: `${vehicle.category} · ${vehicle.seats} Seater · ${vehicle.transmission}`,
                      rentalType,
                      withDriver,
                      driverZoneLabel: withDriver ? (driverZone === 'outside' ? 'Outside province' : 'Inside province') : undefined,
                      pickupLocation,
                      pickupDate: pickup,
                      returnDate: ret,
                      pickupTime,
                      returnTime,
                      renterName: signerName,
                      renterEmail: form.getValues('email'),
                      renterPhone: form.getValues('phone'),
                      renterAddress: form.getValues('address'),
                      pricing,
                      specialRequest: request,
                      signatureDataUrl,
                      signedAtIso,
                    })
                  }}
                />
              ) : null}
              <div className="mt-5 flex justify-between">
                <Button variant="outline" onClick={() => (step === 0 ? navigate('/cars') : setStep((value) => value - 1))}><ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Back to Cars' : 'Back'}</Button>
                {step === 0 ? <Button onClick={next}>Continue to Your Information <ArrowRight className="h-4 w-4" /></Button> : null}
                {step === 1 ? <Button type="submit" form="customer-form">Review & Confirm <ArrowRight className="h-4 w-4" /></Button> : null}
                {step === 2 ? (
                  <Button
                    onClick={confirm}
                    disabled={!contractDraft || confirming}
                    title={!contractDraft ? 'Sign the rental contract first' : undefined}
                  >
                    {confirming ? 'Submitting…' : 'Confirm Booking'}
                  </Button>
                ) : null}
              </div>
            </div>
            <Summary
              vehicleName={vehicle.name}
              meta={`${vehicle.category} · ${vehicle.seats} Seater · ${vehicle.transmission} · ${vehicle.fuel}`}
              image={vehicle.images[0]}
              rentalType={rentalType}
              withDriver={withDriver}
              pickup={pickup}
              ret={ret}
              pricing={pricing}
              driverZone={driverZone}
              driverPackage={data.settings.defaultDriverPackage}
            />
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
            <p className="mt-3 text-sm text-muted">Our team will confirm availability. Payment is recorded separately after approval.</p>
            {done.checkout?.guestEmail ? (
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                {done.checkout.guestLoginEmailSent ? (
                  <>
                    We emailed login details to <strong>{done.checkout.guestEmail}</strong>. Sign in anytime to track this booking.
                  </>
                ) : (
                  <>
                    We could not send the email right now. Sign in with <strong>{done.checkout.guestEmail}</strong> and the password you used when
                    booking.
                  </>
                )}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => navigate('/cars')}>Browse cars</Button>
              {session?.role === 'customer' ? (
                <Button onClick={() => navigate('/customer/bookings')}>View my bookings</Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(`/login?next=${encodeURIComponent('/customer/bookings')}`)}>
                  Sign in to track booking
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RenterDocumentUpload({
  label,
  labelInfo,
  required,
  picked,
  onPick,
  className,
}: {
  label: string
  labelInfo?: string
  required?: boolean
  picked?: PickedRenterDoc
  onPick: (file: File) => void
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-slate-100 bg-slate-50/60 p-3', className)}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-ink">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </span>
        {labelInfo ? (
          <Popover.Root>
            <Popover.Trigger
              type="button"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-white text-muted hover:border-navy/30 hover:text-navy"
              aria-label={`About ${label}`}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="top"
                align="start"
                sideOffset={6}
                className="z-[70] max-w-xs rounded-xl border border-line bg-white p-3 text-xs leading-relaxed text-muted shadow-lg"
              >
                {labelInfo}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <FileUploadButton
          label={picked ? 'Change file' : 'Upload file'}
          accept={RENTER_DOC_ACCEPT}
          variant="primary"
          onPick={onPick}
        />
        {picked ? <span className="text-xs font-medium text-ink">{picked.file.name}</span> : null}
      </div>
      {picked?.preview ? (
        <img src={picked.preview} alt="" className="mt-2 h-24 max-w-xs rounded-xl border border-white object-cover shadow-sm" />
      ) : null}
    </div>
  )
}

function Summary({
  vehicleName,
  meta,
  image,
  rentalType,
  withDriver,
  pickup,
  ret,
  pricing,
  driverZone,
  driverPackage,
}: {
  vehicleName: string
  meta: string
  image?: string
  rentalType: RentalType
  withDriver: boolean
  pickup: string
  ret: string
  pricing: ReturnType<typeof quotePackage>
  driverZone: DriverServiceZone
  driverPackage: import('@/types').DriverPackageSettings
}) {
  const driverQuote = quoteDriverFee(pricing.days, driverZone, driverPackage)
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
        <div className="flex justify-between gap-2">
          <span className="text-muted">Driver package</span>
          <span className={cn('text-right font-semibold', !withDriver && 'text-muted')}>
            {withDriver ? formatPeso(pricing.driver) : `Not included (${formatPeso(driverQuote)} if added)`}
          </span>
        </div>
        <SecurityDepositSummary amount={pricing.securityDeposit} />
        <div className="flex justify-between rounded-xl bg-amber-50 px-3 py-2 font-extrabold"><span>Total Rental Amount</span><span>{formatPeso(pricing.total)}</span></div>
      </div>
      <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Your booking stays pending until Drive Moko confirms it. You will receive an in-app notification when the status changes.</p>
    </aside>
  )
}
