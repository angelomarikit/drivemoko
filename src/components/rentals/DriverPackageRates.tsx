import type { DriverPackageSettings } from '@/types'
import { DEFAULT_DRIVER_PACKAGE, driverPackageLabel, quoteDriverFee, type DriverServiceZone } from '@/utils/driverPackage'
import { formatPeso } from '@/utils/money'
import { cn } from '@/utils/cn'
import { Check } from 'lucide-react'

export function DriverPackageRates({
  driverZone,
  onDriverZoneChange,
  withDriver,
  onWithDriverChange,
  days,
  compact,
  disabled,
  package: driverPackage = DEFAULT_DRIVER_PACKAGE,
}: {
  driverZone: DriverServiceZone
  onDriverZoneChange?: (zone: DriverServiceZone) => void
  withDriver: boolean
  onWithDriverChange?: (value: boolean) => void
  days?: number
  compact?: boolean
  disabled?: boolean
  package?: DriverPackageSettings
}) {
  const zoneSelectable = onDriverZoneChange != null
  const includeSelectable = onWithDriverChange != null
  const estimated = days && days > 0 ? quoteDriverFee(days, driverZone, driverPackage) : 0
  const zoneLabel = driverPackageLabel(driverZone)

  return (
    <div
      className={cn(
        `rounded-2xl border-2 bg-white ${compact ? 'p-3' : 'p-4'}`,
        withDriver && includeSelectable ? 'border-gold shadow-sm' : 'border-line',
      )}
    >
      <p className={`font-bold text-navy ${compact ? 'text-sm' : 'text-base'}`}>Driver package</p>
      <p className="mt-0.5 text-xs text-muted">
        {zoneSelectable ? (
          <>
            Tap a package below for <strong>where the driver will travel</strong> ({zoneLabel} selected).{' '}
          </>
        ) : (
          <>Service area: {zoneLabel}. </>
        )}
        {withDriver ? 'Driver is included in your total.' : 'Self-drive by default — turn on below to add a driver.'}
      </p>

      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <button
          type="button"
          disabled={!zoneSelectable}
          onClick={() => onDriverZoneChange?.('inside')}
          className={cn(
            'rounded-xl border-2 px-3 py-3 text-left transition',
            zoneSelectable && 'cursor-pointer hover:border-gold/80 hover:shadow-sm',
            driverZone === 'inside' ? 'border-gold bg-gold/15 ring-2 ring-gold/35' : 'border-line bg-canvas',
            !zoneSelectable && 'cursor-default',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Inside Nueva Vizcaya</p>
            {driverZone === 'inside' ? (
              <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-extrabold text-ink">{formatPeso(driverPackage.insidePerDay)}</p>
          <p className="text-[10px] font-medium text-muted">per day (all rental days)</p>
        </button>
        <button
          type="button"
          disabled={!zoneSelectable}
          onClick={() => onDriverZoneChange?.('outside')}
          className={cn(
            'rounded-xl border-2 px-3 py-3 text-left transition',
            zoneSelectable && 'cursor-pointer hover:border-gold/80 hover:shadow-sm',
            driverZone === 'outside' ? 'border-gold bg-gold/15 ring-2 ring-gold/35' : 'border-line bg-canvas',
            !zoneSelectable && 'cursor-default',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Outside Nueva Vizcaya</p>
            {driverZone === 'outside' ? (
              <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
            ) : null}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted">1st day</p>
              <p className="text-sm font-extrabold text-ink">{formatPeso(driverPackage.outsideFirstDay)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted">Succeeding</p>
              <p className="text-sm font-extrabold text-ink">{formatPeso(driverPackage.outsideSucceeding)}</p>
              <p className="text-[10px] text-muted">/ day</p>
            </div>
          </div>
        </button>
      </div>

      {estimated > 0 ? (
        <p className="mt-3 text-center text-xs font-semibold text-ink">
          Driver fee for this trip ({days} day{days === 1 ? '' : 's'}, {zoneLabel}):{' '}
          <span className="text-base font-extrabold text-navy">{formatPeso(estimated)}</span>
          {!withDriver ? <span className="font-normal text-muted"> · not added until you include driver</span> : null}
        </p>
      ) : null}

      {includeSelectable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={withDriver}
          aria-label="Include driver with this rental"
          disabled={disabled}
          onClick={() => onWithDriverChange(!withDriver)}
          className={cn(
            'mt-3 flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition',
            withDriver
              ? 'border-gold bg-gold shadow-md'
              : 'border-navy bg-navy/5 hover:border-gold hover:bg-amber-50',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2',
              withDriver ? 'border-ink bg-white text-ink' : 'border-navy bg-white',
            )}
            aria-hidden
          >
            {withDriver ? <Check className="h-5 w-5 stroke-[3]" /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-ink">
              {withDriver ? 'Driver included' : 'Include driver with this rental'}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-muted">
              {withDriver
                ? 'Tap to switch back to self-drive.'
                : `Adds ${formatPeso(estimated)} to your total for this schedule.`}
            </span>
          </span>
        </button>
      ) : null}

      <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
        Choose <strong>outside</strong> if the trip leaves Nueva Vizcaya (e.g. Baguio, Manila). Choose <strong>inside</strong> for
        travel within the province only.
      </p>
    </div>
  )
}