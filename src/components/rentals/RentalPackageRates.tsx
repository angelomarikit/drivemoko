import type { RentalPackage } from '@/types'
import type { RentalServiceZone } from '@/utils/driverPackage'
import { rentalServiceZoneLabel } from '@/utils/rentalPackage'
import { formatPeso } from '@/utils/money'
import { cn } from '@/utils/cn'

const tiers: { key: keyof RentalPackage; label: string }[] = [
  { key: 'rateFirstDay', label: '1 day' },
  { key: 'rateSucceeding', label: 'Succeeding days' },
  { key: 'rate10Days', label: '10+ days' },
  { key: 'rate15Plus', label: '15+ days' },
]

type Props = {
  compact?: boolean
  package?: RentalPackage
  /** When set, shows inside / outside tabs and switches displayed tiers. */
  packages?: { inside: RentalPackage; outside: RentalPackage }
  zone?: RentalServiceZone
  onZoneChange?: (zone: RentalServiceZone) => void
}

export function RentalPackageRates({ package: single, packages, zone = 'inside', onZoneChange, compact }: Props) {
  const rates = packages ? (zone === 'outside' ? packages.outside : packages.inside) : single
  if (!rates) return null
  const zoneSelectable = onZoneChange != null && packages != null

  return (
    <div className={`rounded-2xl border border-line bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <p className={`font-bold text-navy ${compact ? 'text-sm' : 'text-base'}`}>Rental package</p>
      <p className="mt-0.5 text-xs text-muted">
        {zoneSelectable
          ? 'Choose where the vehicle will travel. Rates below apply to the full rental length.'
          : 'Per-day rates by rental length (reference for this vehicle).'}
      </p>

      {zoneSelectable ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(['inside', 'outside'] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => onZoneChange?.(z)}
              className={cn(
                'rounded-xl border-2 px-3 py-2.5 text-left transition',
                'cursor-pointer hover:border-gold/80 hover:shadow-sm',
                zone === z ? 'border-gold bg-gold/15 ring-2 ring-gold/35' : 'border-line bg-canvas',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{rentalServiceZoneLabel(z)}</p>
                {zone === z ? (
                  <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-semibold text-ink">
                From {formatPeso((z === 'outside' ? packages.outside : packages.inside).rate15Plus)} / day
              </p>
            </button>
          ))}
        </div>
      ) : null}

      <TierGrid rates={rates} compact={compact} />
      <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
        {zoneSelectable ? (
          <>
            <strong>{rentalServiceZoneLabel(zone)}</strong> rates shown. 1 day = 24 hours from pickup time.
          </>
        ) : (
          <>1 day = 24 hours from pickup time.</>
        )}
      </p>
    </div>
  )
}

function TierGrid({ rates, compact }: { rates: RentalPackage; compact?: boolean }) {
  return (
    <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {tiers.map((tier) => (
        <div key={tier.key} className="rounded-xl border border-line bg-canvas px-2 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{tier.label}</p>
          <p className="mt-1 text-sm font-extrabold text-ink">{formatPeso(rates[tier.key])}</p>
          <p className="text-[10px] font-medium text-muted">/ day</p>
        </div>
      ))}
    </div>
  )
}