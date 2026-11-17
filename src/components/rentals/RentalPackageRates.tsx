import type { RentalPackage } from '@/types'
import { formatPeso } from '@/utils/money'

const tiers: { key: keyof RentalPackage; label: string }[] = [
  { key: 'rateFirstDay', label: '1 day' },
  { key: 'rateSucceeding', label: 'Succeeding days' },
  { key: 'rate10Days', label: '10+ days' },
  { key: 'rate15Plus', label: '15+ days' },
]

export function RentalPackageRates({ package: rates, compact }: { package: RentalPackage; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white ${compact ? 'p-3' : 'p-4'}`}
    >
      <p className={`font-bold text-navy ${compact ? 'text-sm' : 'text-base'}`}>Rental package</p>
      <p className="mt-0.5 text-xs text-muted">Per-day rates by rental length (reference for this vehicle).</p>
      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className="rounded-xl border border-line bg-canvas px-2 py-2.5 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{tier.label}</p>
            <p className="mt-1 text-sm font-extrabold text-ink">{formatPeso(rates[tier.key])}</p>
            <p className="text-[10px] font-medium text-muted">/ day</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
        1 day = 24 hours from pickup time.
      </p>
    </div>
  )
}