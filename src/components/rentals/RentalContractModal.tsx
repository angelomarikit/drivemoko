import { Eraser, FileText } from 'lucide-react'
import { useRef, useState } from 'react'
import { SignaturePadCanvas, type SignaturePadHandle } from '@/components/rentals/SignaturePadCanvas'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RENTAL_AGREEMENT_CLAUSES, RENTAL_AGREEMENT_COMPANY } from '@/constants/content'
import { SecurityDepositSummary } from '@/components/rentals/SecurityDepositSummary'
import type { RentalContractData } from '@/utils/rentalContract'
import {
  buildRentalContractPdf,
  contractFileName,
  downloadContractBlob,
} from '@/utils/rentalContract'
import { formatPretty, formatTime } from '@/utils/dates'
import { formatPeso } from '@/utils/money'
import type { PriceBreakdown, RentalType } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  vehicleName: string
  vehicleMeta: string
  vehicleMakeModel: string
  vehiclePlate: string
  vehicleColor: string
  vehicleFuel: string
  rentalType: RentalType
  withDriver: boolean
  driverZoneLabel?: string
  pickupLocation: string
  destinationRoute: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  renterName: string
  renterEmail: string
  renterPhone: string
  renterAddress: string
  renterLicenseId?: string
  pricing: PriceBreakdown
  specialRequest?: string
  onSigned: (payload: {
    signatureDataUrl: string
    signedAtIso: string
    signerName: string
    draftFile: File
  }) => void
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="border-b border-slate-300 pb-0.5 text-sm font-semibold text-navy">{value || '-'}</p>
    </div>
  )
}

export function RentalContractModal({ open, onClose, onSigned, ...data }: Props) {
  const padRef = useRef<SignaturePadHandle>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const contractBase = (): Omit<RentalContractData, 'signatureDataUrl' | 'signedAtIso'> => ({
    vehicleName: data.vehicleName,
    vehicleMeta: data.vehicleMeta,
    vehicleMakeModel: data.vehicleMakeModel,
    vehiclePlate: data.vehiclePlate,
    vehicleColor: data.vehicleColor,
    vehicleFuel: data.vehicleFuel,
    rentalType: data.rentalType,
    withDriver: data.withDriver,
    driverZoneLabel: data.driverZoneLabel,
    pickupLocation: data.pickupLocation,
    destinationRoute: data.destinationRoute,
    pickupDate: data.pickupDate,
    returnDate: data.returnDate,
    pickupTime: data.pickupTime,
    returnTime: data.returnTime,
    renterName: data.renterName,
    renterEmail: data.renterEmail,
    renterPhone: data.renterPhone,
    renterAddress: data.renterAddress,
    renterLicenseId: data.renterLicenseId,
    pricing: data.pricing,
    specialRequest: data.specialRequest,
  })

  const otherCharges = data.pricing.insurance + data.pricing.driver + data.pricing.childSeat
  const title =
    data.rentalType === 'with-driver' || data.withDriver
      ? 'Car rental agreement (with driver)'
      : 'Self-drive car rental agreement'

  const signAndSave = async () => {
    setError('')
    const pad = padRef.current
    if (!pad || pad.isEmpty()) {
      setError('Add your signature before saving.')
      return
    }
    setBusy(true)
    try {
      const signedAtIso = new Date().toISOString()
      const signatureDataUrl = pad.toDataURL()
      const payload: RentalContractData = { ...contractBase(), signatureDataUrl, signedAtIso }
      const blob = await buildRentalContractPdf(payload)
      const file = new File([blob], contractFileName(), { type: 'application/pdf' })
      downloadContractBlob(blob, file.name)
      onSigned({ signatureDataUrl, signedAtIso, signerName: data.renterName, draftFile: file })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate contract PDF.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Rental contract"
      description="Nehemiah / Drive Moko agreement — sign below, then download the 2-page PDF."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(260px,300px)] lg:items-start">
        <div className="max-h-[min(52vh,520px)] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <p className="text-xs font-bold uppercase text-navy">{RENTAL_AGREEMENT_COMPANY.legalName}</p>
              <p className="text-xs text-muted">{RENTAL_AGREEMENT_COMPANY.tradeName}</p>
            </div>
            <p className="max-w-[130px] text-right text-[10px] font-bold uppercase leading-tight text-navy">{title}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Business name" value={RENTAL_AGREEMENT_COMPANY.legalName} />
            <Field label="Full name" value={data.renterName} />
            <Field label="Address" value={RENTAL_AGREEMENT_COMPANY.address} />
            <Field label="Complete address" value={data.renterAddress} />
            <Field label="Contact no." value={RENTAL_AGREEMENT_COMPANY.contact} />
            <Field label="Contact number" value={data.renterPhone} />
            <Field label="Make & model" value={data.vehicleMakeModel} />
            <Field label="Plate" value={data.vehiclePlate} />
            <Field label="Daily rate" value={formatPeso(data.pricing.dailyRate)} />
            <Field label="Days" value={String(data.pricing.days)} />
            <Field
              label="Schedule"
              value={`${formatPretty(data.pickupDate)} @ ${formatTime(data.pickupTime)} – ${formatPretty(data.returnDate)} @ ${formatTime(data.returnTime)}`}
            />
            <Field label="Destination / route" value={data.destinationRoute} />
          </div>
          <div className="rounded-xl bg-white p-3 text-xs">
            <SecurityDepositSummary amount={data.pricing.securityDeposit} />
            {otherCharges > 0 ? (
              <p className="mt-1 flex justify-between">
                <span className="text-muted">Other charges</span>
                <span className="font-semibold">{formatPeso(otherCharges)}</span>
              </p>
            ) : null}
            <p className="mt-1 flex justify-between font-extrabold text-navy">
              <span>Total</span>
              <span>{formatPeso(data.pricing.total)}</span>
            </p>
          </div>
          <p className="text-[11px] text-muted">
            Full terms on the PDF ({RENTAL_AGREEMENT_CLAUSES.length} clauses, 2 pages).
          </p>
        </div>
        <div className="space-y-3 lg:sticky lg:top-0">
          <p className="flex items-center gap-2 text-sm font-bold text-navy">
            <FileText className="h-4 w-4" aria-hidden />
            Digital signature
          </p>
          <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
            {open ? <SignaturePadCanvas ref={padRef} active={open} /> : null}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => padRef.current?.clear()}>
            <Eraser className="h-4 w-4" /> Clear signature
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="button" className="w-full" disabled={busy} onClick={signAndSave}>
            {busy ? 'Saving…' : 'Sign & download PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}