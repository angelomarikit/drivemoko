import { RentalPackageRates } from '@/components/rentals/RentalPackageRates'
import { Button } from '@/components/ui/Button'
import { FieldLabel, TextInput } from '@/components/ui/Fields'
import type { RentalPackage } from '@/types'

type Props = {
  value: RentalPackage
  onChange: (next: RentalPackage) => void
  onSave?: () => void
  saveLabel?: string
  saving?: boolean
  /** Show tiled preview below inputs (default on). */
  showPreview?: boolean
}

export function RentalPackageEditor({
  value,
  onChange,
  onSave,
  saveLabel = 'Save package',
  saving,
  showPreview = true,
}: Props) {
  const set = (key: keyof RentalPackage, raw: string) => {
    onChange({ ...value, [key]: Number(raw) || 0 })
  }
  return (
    <div className="space-y-3">
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