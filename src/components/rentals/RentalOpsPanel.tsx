import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DateField, TextArea, TextInput } from '@/components/ui/Fields'
import { useSession } from '@/hooks/useDemo'
import { isSupabaseProvider } from '@/lib/config'
import { approveExtension, flagLateReturn, listExtensions, requestExtension } from '@/services/rentals/extensions'
import { listInspections, upsertInspection } from '@/services/rentals/inspections'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Booking } from '@/types'
import { toast } from 'sonner'

export function RentalOpsPanel({ booking, mode }: { booking: Booking; mode: string }) {
  const session = useSession()
  const queryClient = useQueryClient()
  const enabled = isSupabaseProvider() && mode === 'admin'
  const inspections = useQuery({
    queryKey: ['inspections', booking.id],
    enabled,
    queryFn: () => listInspections(booking.id),
  })
  const extensions = useQuery({
    queryKey: ['extensions', booking.id],
    enabled,
    queryFn: () => listExtensions(booking.id),
  })
  const [checkout, setCheckout] = useState({ odometer: '', fuel: 'Full', condition: '', damage: '' })
  const [returnForm, setReturnForm] = useState({ odometer: '', fuel: 'Full', condition: '', damage: '', extra: '' })
  const [ext, setExt] = useState({ date: booking.returnDate, time: booking.returnTime, reason: '', charge: '0' })
  const [lateFee, setLateFee] = useState('0')

  if (!enabled) {
    return (
      <p className="text-xs text-muted">
        Check-out, return, and extensions require Supabase and migration 018–019.
      </p>
    )
  }

  if (!session) return null

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <h3 className="font-bold">Rental operations</h3>
      <OPSection title="Check-out" bookingStatus={booking.status} allowed={['confirmed']}>
        <div className="grid gap-2 md:grid-cols-2">
          <TextInput placeholder="Odometer (km)" value={checkout.odometer} onChange={(e) => setCheckout({ ...checkout, odometer: e.target.value })} />
          <TextInput placeholder="Fuel level" value={checkout.fuel} onChange={(e) => setCheckout({ ...checkout, fuel: e.target.value })} />
          <TextArea className="md:col-span-2" placeholder="Condition notes" value={checkout.condition} onChange={(e) => setCheckout({ ...checkout, condition: e.target.value })} />
          <TextArea className="md:col-span-2" placeholder="Existing damage" value={checkout.damage} onChange={(e) => setCheckout({ ...checkout, damage: e.target.value })} />
        </div>
        <Button
          size="sm"
          className="mt-2"
          onClick={async () => {
            try {
              await upsertInspection({
                bookingId: booking.id,
                phase: 'checkout',
                odometerKm: checkout.odometer ? Number(checkout.odometer) : undefined,
                fuelLevel: checkout.fuel,
                conditionNotes: checkout.condition,
                damageNotes: checkout.damage,
                staffId: session.id,
                customerAck: true,
              })
              toast.success('Check-out recorded.')
              void queryClient.invalidateQueries({ queryKey: ['inspections', booking.id] })
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Could not save check-out.')
            }
          }}
        >
          Save check-out
        </Button>
      </OPSection>

      <OPSection title="Return inspection" bookingStatus={booking.status} allowed={['ongoing', 'completed']}>
        <div className="grid gap-2 md:grid-cols-2">
          <TextInput placeholder="Ending odometer" value={returnForm.odometer} onChange={(e) => setReturnForm({ ...returnForm, odometer: e.target.value })} />
          <TextInput placeholder="Fuel level" value={returnForm.fuel} onChange={(e) => setReturnForm({ ...returnForm, fuel: e.target.value })} />
          <TextInput placeholder="Extra charges (₱)" value={returnForm.extra} onChange={(e) => setReturnForm({ ...returnForm, extra: e.target.value })} />
          <TextArea className="md:col-span-2" placeholder="Return notes" value={returnForm.condition} onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })} />
        </div>
        <Button
          size="sm"
          className="mt-2"
          onClick={async () => {
            try {
              await upsertInspection({
                bookingId: booking.id,
                phase: 'return',
                odometerKm: returnForm.odometer ? Number(returnForm.odometer) : undefined,
                fuelLevel: returnForm.fuel,
                conditionNotes: returnForm.condition,
                damageNotes: returnForm.damage,
                extraChargesPesos: Number(returnForm.extra) || 0,
                staffId: session.id,
                customerAck: true,
              })
              toast.success('Return inspection saved.')
              void queryClient.invalidateQueries({ queryKey: ['inspections', booking.id] })
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Could not save return.')
            }
          }}
        >
          Save return inspection
        </Button>
      </OPSection>

      <OPSection title="Extension request" bookingStatus={booking.status} allowed={['confirmed', 'ongoing']}>
        <div className="grid gap-2 md:grid-cols-2">
          <DateField label="New return date" value={ext.date} onChange={(date) => setExt({ ...ext, date })} />
          <TextInput type="time" value={ext.time} onChange={(e) => setExt({ ...ext, time: e.target.value })} />
          <TextInput placeholder="Additional charge ₱" value={ext.charge} onChange={(e) => setExt({ ...ext, charge: e.target.value })} />
          <TextArea className="md:col-span-2" placeholder="Reason" value={ext.reason} onChange={(e) => setExt({ ...ext, reason: e.target.value })} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await requestExtension({
                  bookingId: booking.id,
                  requestedReturnDate: ext.date,
                  requestedReturnTime: ext.time,
                  reason: ext.reason,
                  additionalChargePesos: Number(ext.charge) || 0,
                  requestedBy: session.id,
                })
                toast.success('Extension requested.')
                void queryClient.invalidateQueries({ queryKey: ['extensions', booking.id] })
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Extension request failed.')
              }
            }}
          >
            Queue extension
          </Button>
          {extensions.data?.[0]?.status === 'pending' ? (
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await approveExtension(extensions.data![0].id)
                  toast.success('Extension approved.')
                  void queryClient.invalidateQueries({ queryKey: ['extensions', booking.id] })
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Could not approve.')
                }
              }}
            >
              Approve latest extension
            </Button>
          ) : null}
        </div>
      </OPSection>

      <OPSection title="Late return" bookingStatus={booking.status} allowed={['ongoing', 'completed']}>
        <TextInput placeholder="Late fee (₱)" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
        <Button
          size="sm"
          className="mt-2"
          variant="outline"
          onClick={async () => {
            try {
              await flagLateReturn(booking.id, Number(lateFee) || 0)
              toast.success('Late return flagged.')
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Update failed.')
            }
          }}
        >
          Record late fee
        </Button>
      </OPSection>

      {inspections.data?.length ? (
        <p className="text-xs text-muted">{inspections.data.length} inspection record(s) on file.</p>
      ) : null}
    </div>
  )
}

function OPSection({
  title,
  bookingStatus,
  allowed,
  children,
}: {
  title: string
  bookingStatus: string
  allowed: string[]
  children: React.ReactNode
}) {
  if (!allowed.includes(bookingStatus)) {
    return (
      <div className="rounded-xl bg-canvas px-3 py-2 text-xs text-muted">
        {title}: available when booking is {allowed.join(' or ')} (current: {bookingStatus}).
      </div>
    )
  }
  return (
    <div className="rounded-xl border px-3 py-3">
      <p className="mb-2 text-sm font-bold">{title}</p>
      {children}
    </div>
  )
}