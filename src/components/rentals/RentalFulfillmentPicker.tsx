import { MapPin, Truck } from 'lucide-react'
import { CORPORATE_OFFICE, type FulfillmentMode } from '@/constants/pickup'
import { FieldLabel } from '@/components/ui/Fields'
import { cn } from '@/utils/cn'

export function RentalFulfillmentPicker({
  mode,
  onModeChange,
  suggestDelivery,
  compact,
}: {
  mode: FulfillmentMode
  onModeChange: (mode: FulfillmentMode) => void
  /** Show first-time renter note favoring delivery. */
  suggestDelivery?: boolean
  compact?: boolean
}) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <FieldLabel required>Vehicle handover</FieldLabel>
      {suggestDelivery ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          <strong>First-time renters:</strong> we suggest <strong>Deliver to your address</strong>. Enter your full street address on
          the next step.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onModeChange('delivery')}
          className={cn(
            'flex items-start gap-3 rounded-xl border-2 px-3 py-3 text-left transition',
            mode === 'delivery'
              ? 'border-gold bg-gold/15 shadow-sm ring-2 ring-gold/40'
              : 'border-line bg-white hover:border-gold/60',
          )}
        >
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
              mode === 'delivery' ? 'bg-gold text-ink' : 'bg-canvas text-muted',
            )}
          >
            <Truck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-ink">Deliver to your address</span>
            <span className="mt-0.5 block text-xs text-muted">We bring the vehicle to you. Full address on the next step.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange('office')}
          className={cn(
            'flex items-start gap-3 rounded-xl border-2 px-3 py-3 text-left transition',
            mode === 'office'
              ? 'border-gold bg-gold/15 shadow-sm ring-2 ring-gold/40'
              : 'border-line bg-white hover:border-gold/60',
          )}
        >
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
              mode === 'office' ? 'bg-gold text-ink' : 'bg-canvas text-muted',
            )}
          >
            <MapPin className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-ink">Get to our location</span>
            <span className="mt-0.5 block text-xs text-muted">Pick up at our Bayombong corporate office.</span>
          </span>
        </button>
      </div>
      {mode === 'office' ? (
        <div className="rounded-xl border border-line bg-canvas px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-danger">Location</p>
          <div className="mt-1 flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
            <div className="text-sm font-bold leading-snug text-ink">
              <p>{CORPORATE_OFFICE.name}</p>
              {CORPORATE_OFFICE.lines.map((line) => (
                <p key={line} className="font-semibold">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}