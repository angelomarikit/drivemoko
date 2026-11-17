import { DriverPackageRates } from '@/components/rentals/DriverPackageRates'
import { Button } from '@/components/ui/Button'
import { FieldLabel, TextInput } from '@/components/ui/Fields'
import type { DriverPackageSettings } from '@/types'

type Props = {
  value: DriverPackageSettings
  onChange: (next: DriverPackageSettings) => void
  onSave?: () => void
  saveLabel?: string
  saving?: boolean
}

export function DriverPackageEditor({ value, onChange, onSave, saveLabel = 'Save driver package', saving }: Props) {
  const set = (key: keyof DriverPackageSettings, raw: string) => {
    onChange({ ...value, [key]: Number(raw) || 0 })
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <FieldLabel>Inside (per day)</FieldLabel>
          <TextInput type="number" value={value.insidePerDay} onChange={(e) => set('insidePerDay', e.target.value)} />
        </label>
        <label>
          <FieldLabel>Outside — 1st day</FieldLabel>
          <TextInput type="number" value={value.outsideFirstDay} onChange={(e) => set('outsideFirstDay', e.target.value)} />
        </label>
        <label>
          <FieldLabel>Outside — succeeding</FieldLabel>
          <TextInput type="number" value={value.outsideSucceeding} onChange={(e) => set('outsideSucceeding', e.target.value)} />
        </label>
      </div>
      <DriverPackageRates driverZone="inside" withDriver={false} days={2} package={value} />
      {onSave ? (
        <Button type="button" onClick={onSave} disabled={saving}>
          {saveLabel}
        </Button>
      ) : null}
    </div>
  )
}