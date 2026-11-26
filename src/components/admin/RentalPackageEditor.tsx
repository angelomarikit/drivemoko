import { RentalPackageRates } from '@/components/rentals/RentalPackageRates'
import { Button } from '@/components/ui/Button'
import { FieldLabel, TextInput } from '@/components/ui/Fields'
import type { RentalPackage } from '@/types'
import type { RentalServiceZone } from '@/utils/driverPackage'
import { type RentalPackagesByZone, rentalServiceZoneLabel } from '@/utils/rentalPackage'
import { cn } from '@/utils/cn'
import { useState } from 'react'

type Props = {
  value: RentalPackage
  onChange: (next: RentalPackage) => void
  onSave?: () => void
  saveLabel?: string
  saving?: boolean
  showPreview?: boolean
  /** Shown above the tier fields (e.g. Within Nueva Vizcaya). */
  sectionTitle?: string
  sectionHint?: string
}

/** Single-zone editor (legacy). */
export function RentalPackageEditor({
  value,
  onChange,
  onSave,
  saveLabel = 'Save package',
  saving,
  showPreview = true,
  sectionTitle,
  sectionHint,
}: Props) {
  const set = (key: keyof RentalPackage, raw: string) => {
    onChange({ ...value, [key]: Number(raw) || 0 })
  }
  return (
    <div className="space-y-3">
      {sectionTitle ? <h3 className="text-sm font-bold text-navy">{sectionTitle}</h3> : null}
      {sectionHint ? <p className="text-xs text-muted">{sectionHint}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <FieldLabel>1 day</FieldLabel>
          <TextInput type="number" value={value.rateFirstDay} onChange={(e) => set('rateFirstDay', e.target.value)} />
        </label>
        <label>
          <FieldLabel>Succeeding days</FieldLabel>
          <TextInput type="number" value={value.rateSucceeding} onChange={(e) => set('rateSucceeding', e.target.value)} />
        </label>
        <label>
          <FieldLabel>10+ days (from day 10)</FieldLabel>
          <TextInput type="number" value={value.rate10Days} onChange={(e) => set('rate10Days', e.target.value)} />
        </label>
        <label>
          <FieldLabel>15+ days (from day 15)</FieldLabel>
          <TextInput type="number" value={value.rate15Plus} onChange={(e) => set('rate15Plus', e.target.value)} />
        </label>
      </div>
      {showPreview ? <RentalPackageRates package={value} compact /> : null}
      {onSave ? (
        <Button type="button" onClick={onSave} disabled={saving}>
          {saveLabel}
        </Button>
      ) : null}
    </div>
  )
}

type ZonedProps = {
  value: RentalPackagesByZone
  onChange: (next: RentalPackagesByZone) => void
  onSave?: () => void
  saveLabel?: string
  saving?: boolean
  showPreview?: boolean
}

export function RentalPackagesByZoneEditor({
  value,
  onChange,
  onSave,
  saveLabel = 'Save package',
  saving,
  showPreview = true,
}: ZonedProps) {
  const [zone, setZone] = useState<RentalServiceZone>('inside')
  const pkg = zone === 'inside' ? value.inside : value.outside

  const set = (key: keyof RentalPackage, raw: string) => {
    const next = { ...pkg, [key]: Number(raw) || 0 }
    onChange(zone === 'inside' ? { ...value, inside: next } : { ...value, outside: next })
  }

  return (
    <div className="space-y-3">
      <ZoneTabs zone={zone} onZone={setZone} />
      <p className="text-xs text-muted">
        Editing <strong>{rentalServiceZoneLabel(zone)}</strong> tiers. Existing vehicle columns (rate_*) are{' '}
        <strong>outside</strong> province; inside uses separate fields in the database.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <FieldLabel>1 day</FieldLabel>
          <TextInput type="number" value={pkg.rateFirstDay} onChange={(e) => set('rateFirstDay', e.target.value)} />
        </label>
        <label>
          <FieldLabel>Succeeding days</FieldLabel>
          <TextInput type="number" value={pkg.rateSucceeding} onChange={(e) => set('rateSucceeding', e.target.value)} />
        </label>
        <label>
          <FieldLabel>10+ days (from day 10)</FieldLabel>
          <TextInput type="number" value={pkg.rate10Days} onChange={(e) => set('rate10Days', e.target.value)} />
        </label>
        <label>
          <FieldLabel>15+ days (from day 15)</FieldLabel>
          <TextInput type="number" value={pkg.rate15Plus} onChange={(e) => set('rate15Plus', e.target.value)} />
        </label>
      </div>
      {showPreview ? (
        <RentalPackageRates packages={value} zone={zone} onZoneChange={setZone} compact />
      ) : null}
      {onSave ? (
        <Button type="button" onClick={onSave} disabled={saving}>
          {saveLabel}
        </Button>
      ) : null}
    </div>
  )
}

function ZoneTabs({ zone, onZone }: { zone: RentalServiceZone; onZone: (z: RentalServiceZone) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['inside', 'outside'] as const).map((z) => (
        <button
          key={z}
          type="button"
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
            zone === z ? 'bg-gold text-ink shadow-sm' : 'bg-canvas text-muted hover:bg-slate-100',
          )}
          onClick={() => onZone(z)}
        >
          {rentalServiceZoneLabel(z)}
        </button>
      ))}
    </div>
  )
}