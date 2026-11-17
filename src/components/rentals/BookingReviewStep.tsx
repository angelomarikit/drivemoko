import { CalendarDays, CarFront, Check, ClipboardList, FileText, Info, Mail, MapPin, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ReactNode } from 'react'
import { VehicleImage } from '@/components/common/VehicleImage'
import { SecurityDepositSummary } from '@/components/rentals/SecurityDepositSummary'
import type { PriceBreakdown, RentalType } from '@/types'
import { formatPretty, formatTime } from '@/utils/dates'
import { formatPeso } from '@/utils/money'
import { cn } from '@/utils/cn'

type Renter = {
  name: string
  email: string
  phone: string
  address: string
}

type Props = {
  vehicleName: string
  vehicleMeta: string
  vehicleImage?: string
  rentalType: RentalType
  withDriver: boolean
  driverZoneLabel?: string
  pickupLocation: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  renter: Renter
  pricing: PriceBreakdown
  specialRequest?: string
  contractSignedAt?: string
  onOpenContract: () => void
}

function ReviewCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy/5 text-navy">{icon}</span>
        {title}
      </h3>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </section>
  )
}

function DetailRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3', className)}>
      <span className="shrink-0 text-xs font-semibold text-muted">{label}</span>
      <span className="font-medium text-ink sm:text-right">{value}</span>
    </div>
  )
}

export function BookingReviewStep({
  vehicleName,
  vehicleMeta,
  vehicleImage,
  rentalType,
  withDriver,
  driverZoneLabel,
  pickupLocation,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  renter,
  pricing,
  specialRequest,
  contractSignedAt,
  onOpenContract,
}: Props) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
          <ClipboardList className="h-5 w-5" aria-hidden />
          Review &amp; Confirm
        </h2>
        <p className="mt-1 text-sm text-muted">Double-check your trip and contact details before you submit.</p>
      </header>

      <div className="flex items-center gap-3 rounded-2xl border border-amber-100/80 bg-amber-50/40 p-3">
        <VehicleImage src={vehicleImage} alt="" className="h-16 w-20 shrink-0 rounded-xl shadow-sm" />
        <div className="min-w-0">
          <p className="truncate font-extrabold text-navy">{vehicleName}</p>
          <p className="text-xs text-muted">{vehicleMeta}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm">
            <CarFront className="h-3 w-3 text-amber-600" aria-hidden />
            {rentalType === 'self-drive' ? 'Self-Drive' : 'With Driver'}
            {withDriver && driverZoneLabel ? ` · ${driverZoneLabel}` : null}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReviewCard title="Renter" icon={<User className="h-3.5 w-3.5" aria-hidden />}>
          <p className="font-bold text-navy">{renter.name}</p>
          <DetailRow
            label="Email"
            value={
              <span className="inline-flex items-center justify-end gap-1.5 break-all">
                <Mail className="hidden h-3.5 w-3.5 shrink-0 text-muted sm:inline" aria-hidden />
                {renter.email}
              </span>
            }
          />
          <DetailRow
            label="Phone"
            value={
              <span className="inline-flex items-center justify-end gap-1.5">
                <Phone className="hidden h-3.5 w-3.5 shrink-0 text-muted sm:inline" aria-hidden />
                {renter.phone}
              </span>
            }
          />
          <DetailRow
            label="Address"
            value={
              <span className="inline-flex items-start justify-end gap-1.5 text-right">
                <MapPin className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-muted sm:inline" aria-hidden />
                {renter.address}
              </span>
            }
          />
        </ReviewCard>

        <ReviewCard title="Trip" icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />}>
          <DetailRow label="Handover" value={pickupLocation} />
          <DetailRow
            label="Schedule"
            value={
              <>
                {formatPretty(pickupDate)} {formatTime(pickupTime)}
                <span className="mx-1 text-muted">→</span>
                {formatPretty(returnDate)} {formatTime(returnTime)}
              </>
            }
          />
          <DetailRow label="Duration" value={`${pricing.days} day${pricing.days === 1 ? '' : 's'}`} />
        </ReviewCard>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Payment summary</p>
        </div>
        <div className="space-y-2 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Rental subtotal</span>
            <span className="font-semibold">{formatPeso(pricing.base)}</span>
          </div>
          {withDriver ? (
            <div className="flex justify-between">
              <span className="text-muted">Driver package</span>
              <span className="font-semibold">{formatPeso(pricing.driver)}</span>
            </div>
          ) : null}
          {pricing.insurance > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">Insurance</span>
              <span className="font-semibold">{formatPeso(pricing.insurance)}</span>
            </div>
          ) : null}
          {pricing.childSeat > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">Child seat</span>
              <span className="font-semibold">{formatPeso(pricing.childSeat)}</span>
            </div>
          ) : null}
          <SecurityDepositSummary amount={pricing.securityDeposit} />
          <div className="mt-2 flex justify-between rounded-xl bg-amber-50 px-3 py-2.5 font-extrabold text-navy">
            <span>Total amount</span>
            <span>{formatPeso(pricing.total)}</span>
          </div>
        </div>
      </section>

      {specialRequest?.trim() ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Special request</p>
          <p className="mt-1 text-ink">{specialRequest.trim()}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-navy">
              <FileText className="h-4 w-4" aria-hidden />
              Rental agreement
            </h3>
            <p className="mt-1 text-sm text-muted">Read, sign, and save the contract PDF before you confirm.</p>
          </div>
          {contractSignedAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-success">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Contract signed
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Signature required</span>
          )}
        </div>
        <Button type="button" className="mt-3" variant={contractSignedAt ? 'outline' : 'primary'} onClick={onOpenContract}>
          {contractSignedAt ? 'View contract again' : 'View rental contract'}
        </Button>
      </section>

      <div
        className="flex gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-sky-50/30 p-4 text-sm text-sky-900"
        role="status"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
        <p>
          Your booking stays <strong className="font-bold">Pending</strong> until Drive Moko confirms it. You&apos;ll get
          an in-app notification when the status changes.
        </p>
      </div>
    </div>
  )
}