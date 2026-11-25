import { useMemo, useState } from 'react'
import { RecordDisbursementModal } from '@/components/partners/RecordDisbursementModal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/Button'
import { FieldLabel, TextArea, TextInput } from '@/components/ui/Fields'
import { useFinancial } from '@/hooks/useFinancial'
import { useDemoActions, useSnapshot } from '@/hooks/useDemo'
import type { PartnerAdminInput, User } from '@/types'
import { formatPretty } from '@/utils/dates'
import {
  buildPartnerRentalLines,
  partnerSliceStats,
} from '@/utils/partnerLedger'
import { PARTNER_COMMISSION_PERCENT } from '@/utils/partnerShare'
import { resolveRentalPackage } from '@/utils/rentalPackage'
import { formatPeso } from '@/utils/money'

export function PersonProfile({ person, onClose }: { person: User; onClose: () => void }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const financial = useFinancial()
  const partner = person.partnerProfile
  const earnings = financial.earnings.data ?? []
  const disbursements = data?.partnerDisbursements ?? []
  const defaultDisplayName =
    person.name && person.name !== person.email
      ? person.name
      : partner?.contactPerson || partner?.businessName || person.name
  const [displayName, setDisplayName] = useState(defaultDisplayName)
  const [notes, setNotes] = useState(person.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const slice = useMemo(() => {
    if (!data || person.role !== 'partner') return null
    return partnerSliceStats(data, disbursements, person.id, earnings)
  }, [data, disbursements, earnings, person.id, person.role])

  const lines = useMemo(() => {
    if (!data || person.role !== 'partner') return []
    return buildPartnerRentalLines(data, disbursements, earnings, person.id)
  }, [data, disbursements, earnings, person.id, person.role])

  const partnerDisb = useMemo(
    () => disbursements.filter((row) => row.partnerId === person.id),
    [disbursements, person.id],
  )

  if (!data) return null
  const vehicles = data.vehicles.filter((vehicle) => vehicle.partnerId === person.id)
  const bookings = data.bookings.filter((booking) => booking.customerId === person.id || vehicles.some((vehicle) => vehicle.id === booking.vehicleId))
  const spend = bookings.filter((booking) => booking.customerId === person.id && booking.paymentStatus === 'paid').reduce((sum, booking) => sum + booking.pricing.total, 0)

  const savePartner = async () => {
    setSaving(true)
    try {
      const input: PartnerAdminInput = {
        name: displayName.trim() || undefined,
        notes,
      }
      await actions.savePartnerAdminProfile(person.id, input)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (person.role === 'partner') {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-line bg-canvas p-3">
          <p className="text-xs text-muted">{person.email}</p>
          <p className="mt-1">{person.phone || '—'} · {person.address || '—'}</p>
        </div>
        {slice ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Fleet', String(slice.fleetCount)],
              ['Rentals', String(slice.rentalCount)],
              ['Commission earned', formatPeso(slice.shareEarned)],
              ['Outstanding', formatPeso(slice.outstandingPayable)],
              ['Disbursed', formatPeso(slice.totalDisbursed)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-white px-3 py-2">
                <p className="text-xs text-muted">{label}</p>
                <p className="font-extrabold">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {partner ? (
          <div className="space-y-1 rounded-xl border border-line bg-white p-3 text-xs">
            <p className="font-bold text-sm text-navy">Agreement & fleet</p>
            <p><span className="text-muted">Business:</span> {partner.businessName || '—'}</p>
            <p><span className="text-muted">Contact:</span> {partner.contactPerson || displayName}</p>
            <p><span className="text-muted">Contract:</span> {partner.contractReference || '—'}</p>
            {partner.agreementSignedAt ? <p><span className="text-muted">Signed:</span> {formatPretty(partner.agreementSignedAt.slice(0, 10))}</p> : null}
            <p><span className="text-muted">Units:</span> {partner.vehicleCount} · {partner.ownershipType}</p>
            {partner.vehicleSummary ? <p className="whitespace-pre-wrap">{partner.vehicleSummary}</p> : null}
          </div>
        ) : null}
        <label className="block">
          <FieldLabel>Display name</FieldLabel>
          <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Partner name on dashboard" />
        </label>
        <div className="rounded-xl border border-line bg-canvas px-3 py-2 text-xs">
          <p className="font-bold text-sm text-navy">Partner commission</p>
          <p className="mt-1">
            <span className="font-extrabold text-success">{PARTNER_COMMISSION_PERCENT}%</span> of each booking total (fixed for all Links).
          </p>
        </div>
        <div>
          <p className="mb-2 font-bold">Rental ledger</p>
          {lines.length === 0 ? (
            <p className="text-muted">No qualifying rentals yet.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-xl border border-line bg-canvas p-3 text-xs">
              {lines.map((line) => (
                <li key={line.bookingId} className="flex flex-wrap justify-between gap-2 border-b border-line/50 py-1 last:border-0">
                  <span>{line.reference} · {line.vehicleName}</span>
                  <span>
                    {formatPeso(line.shareAmount)} · <StatusBadge value={line.payoutStatus === 'paid' ? 'paid' : 'unpaid'} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold">Vehicles ({vehicles.length})</p>
          {vehicles.length === 0 ? (
            <p className="text-muted">No vehicles linked to this partner yet.</p>
          ) : (
            <ul className="space-y-1 rounded-xl border border-line bg-canvas p-3 text-xs">
              {vehicles.map((vehicle) => {
                const rates = resolveRentalPackage(vehicle, data.settings)
                return (
                  <li key={vehicle.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{vehicle.name}</span>
                    <span className="text-muted">
                      1st day {formatPeso(rates.rateFirstDay)} · 2–5d {formatPeso(rates.rateSucceeding)} · 10+d {formatPeso(rates.rate10Days)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold">Disbursements</p>
          {partnerDisb.length === 0 ? (
            <p className="text-muted">No payouts recorded.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {partnerDisb.map((row) => (
                <li key={row.id} className="flex justify-between rounded-lg bg-canvas px-2 py-1">
                  <span>{formatPretty(row.paidAt.slice(0, 10))} · {row.payoutReference}</span>
                  <span className="font-bold text-success">{formatPeso(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" className="mt-2" disabled={!slice?.outstandingPayable} onClick={() => setPayOpen(true)}>
            Record disbursement
          </Button>
        </div>
        <label className="block">
          <FieldLabel>Admin notes</FieldLabel>
          <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </label>
        <p className="text-muted">Paid customer rentals (if any): {formatPeso(spend)}</p>
        <Button type="button" disabled={saving} onClick={savePartner}>
          Save partner profile
        </Button>
        <RecordDisbursementModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          partners={[person]}
          defaultPartnerId={person.id}
          defaultAmount={slice?.outstandingPayable}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <p>{person.email} · {person.phone}</p>
      <p>{person.address}</p>
      <p>Paid rentals: {formatPeso(spend)}</p>
      <p className="font-bold">Bookings</p>
      {bookings.slice(0, 6).map((booking) => (
        <p key={booking.id}>
          {booking.reference} · <StatusBadge value={booking.status} />
        </p>
      ))}
      <label className="block">
        <FieldLabel>Notes</FieldLabel>
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <Button
        type="button"
        onClick={async () => {
          await actions.updateUser(person.id, { notes })
          onClose()
        }}
      >
        Save profile
      </Button>
    </div>
  )
}