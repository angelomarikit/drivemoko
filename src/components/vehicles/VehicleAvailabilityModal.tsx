import { Modal } from '@/components/ui/Modal'
import { VehicleAvailabilityCalendar } from '@/components/vehicles/VehicleAvailabilityCalendar'
import type { Vehicle } from '@/types'

export function VehicleAvailabilityModal({
  vehicle,
  open,
  onClose,
}: {
  vehicle: Vehicle | null
  open: boolean
  onClose: () => void
}) {
  if (!vehicle) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${vehicle.name} availability`}
      description="Green days are open for booking. Orange and yellow show reserved dates in this demo."
    >
      <VehicleAvailabilityCalendar vehicleId={vehicle.id} />
    </Modal>
  )
}
