import { Eraser, FileText } from 'lucide-react'
import { useRef, useState } from 'react'
import { SignaturePadCanvas, type SignaturePadHandle } from '@/components/rentals/SignaturePadCanvas'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { BRAND, RENTAL_TERMS } from '@/constants/content'
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
  rentalType: RentalType
  withDriver: boolean
  driverZoneLabel?: string
  pickupLocation: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  renterName: string
  renterEmail: string
  renterPhone: string
  renterAddress: string
  pricing: PriceBreakdown
  specialRequest?: string
  onSigned: (payload: {
    signatureDataUrl: string
    signedAtIso: string
    signerName: string
    draftFile: File
  }) => void
}

export function RentalContractModal({
  open,
  onClose,
  onSigned,
  ...data
}: Props) {
  const padRef = useRef<SignaturePadHandle>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const contractBase = (): Omit<RentalContractData, 'signatureDataUrl' | 'signedAtIso'> => ({
    vehicleName: data.vehicleName,
    vehicleMeta: data.vehicleMeta,
    rentalType: data.rentalType,
    withDriver: data.withDriver,
    driverZoneLabel: data.driverZoneLabel,
    pickupLocation: data.pickupLocation,
    pickupDate: data.pickupDate,
    returnDate: data.returnDate,
    pickupTime: data.pickupTime,
    returnTime: data.returnTime,
    renterName: data.renterName,
    renterEmail: data.renterEmail,
    renterPhone: data.renterPhone,
    renterAddress: data.renterAddress,
    pricing: data.pricing,
    specialRequest: data.specialRequest,
  })

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
      const payload: RentalContractData = {
        ...contractBase(),
        signatureDataUrl,
        signedAtIso,
      }
      const blob = await buildRentalContractPdf(payload)
      const file = new File([blob], contractFileName(), { type: 'application/pdf' })
      downloadContractBlob(blob, file.name)
      onSigned({
        signatureDataUrl,
        signedAtIso,
        signerName: data.renterName,
        draftFile: file,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate contract PDF.')
    } finally {
      setBusy(false)
    }
  }

  const rentalLabel =
    data.rentalType === 'self-drive' ? 'Self-Drive' : `With Driver${data.driverZoneLabel ? ` · ${data.driverZoneLabel}` : ''}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Rental contract"
      description="Read the agreement, sign below, then save the PDF to continue booking."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(260px,300px)] lg:items-start">
        <div className="max-h-[min(52vh,520px)] space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <img src="/logo.jpg" alt="" className="h-14 w-14 rounded-full bg-white object-cover shadow-sm" />
            <div>
              <p className="font-extrabold text-navy">{BRAND.name}</p>
              <p className="text-xs text-muted">{BRAND.company}</p>
              <p className="text-xs text-muted">{BRAND.place}</p>
            </div>
          </div>
          <h3 className="font-bold text-navy">Rental particulars</h3>
          <dl className="grid gap-1 text-sm">
            <section>
              <dt className="text-muted">Vehicle</dt>
              <dd className="font-semibold">
                {data.vehicleName} · {data.vehicleMeta}
              </dd>
            </section>
            <section>
              <dt className="text-muted">Type</dt>
              <dd className="font-semibold">{rentalLabel}</dd>
            </section>
            <section>
              <dt className="text-muted">Handover</dt>
              <dd className="font-semibold">{data.pickupLocation}</dd>
            </section>
            <section>
              <dt className="text-muted">Schedule</dt>
              <dd className="font-semibold">
                {formatPretty(data.pickupDate)} {formatTime(data.pickupTime)} – {formatPretty(data.returnDate)}{' '}
                {formatTime(data.returnTime)} ({data.pricing.days} days)
              </dd>
            </section>
          </dl>
          <div className="space-y-1 rounded-xl bg-white p-3">
            <div className="flex justify-between">
              <span className="text-muted">Rental subtotal</span>
              <span className="font-semibold">{formatPeso(data.pricing.base)}</span>
            </div>
            {data.withDriver && data.pricing.driver > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted">Driver package</span>
                <span className="font-semibold">{formatPeso(data.pricing.driver)}</span>
              </div>
            ) : null}
            <SecurityDepositSummary amount={data.pricing.securityDeposit} />
            <div className="flex justify-between border-t border-slate-100 pt-2 font-extrabold text-navy">
              <span>Total</span>
              <span>{formatPeso(data.pricing.total)}</span>
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-bold text-navy">Renter</h3>
            <p className="font-semibold">{data.renterName}</p>
            <p className="text-muted">{data.renterEmail}</p>
            <p className="text-muted">{data.renterPhone}</p>
            <p className="text-muted">{data.renterAddress}</p>
          </div>
          <div>
            <h3 className="mb-2 font-bold text-navy">Terms and conditions</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              {RENTAL_TERMS.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-0">
          <p className="flex items-center gap-2 text-sm font-bold text-navy">
            <FileText className="h-4 w-4" aria-hidden />
            Digital signature
          </p>
          <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
            {open ? <SignaturePadCanvas ref={padRef} active={open} /> : null}
          </div>
          <p className="text-xs text-muted">Draw with your mouse or finger inside the box above.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => padRef.current?.clear()}
          >
            <Eraser className="h-4 w-4" /> Clear signature
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="button" className="w-full" disabled={busy} onClick={signAndSave}>
            {busy ? 'Saving…' : 'Sign & save PDF'}
          </Button>
          <p className="text-xs text-muted">Saving downloads a copy for your records and unlocks Confirm booking.</p>
        </div>
      </div>
    </Modal>
  )
}