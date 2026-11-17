export type FulfillmentMode = 'delivery' | 'office'

export const CORPORATE_OFFICE = {
  name: 'Nehemiah Sales and Services',
  lines: ['Corporate Office,', 'Beside Mrs G. Bayombong,', 'Nueva Vizcaya'],
} as const

/** Stored on bookings when the renter picks up at the office. */
export const OFFICE_PICKUP_LOCATION = 'Get to our location — Bayombong, Nueva Vizcaya'

/** Used for inside/outside driver pricing when mode is office. */
export const OFFICE_DRIVER_AREA = 'Bayombong'

export const DELIVERY_PICKUP_LOCATION = 'Deliver to your address'

/** @param deliveryArea Legacy bookings only (e.g. `Deliver … — Solano`). */
export function buildPickupLocation(mode: FulfillmentMode, deliveryArea?: string) {
  if (mode === 'office') return OFFICE_PICKUP_LOCATION
  if (deliveryArea && deliveryArea !== OFFICE_DRIVER_AREA) {
    return `${DELIVERY_PICKUP_LOCATION} — ${deliveryArea}`
  }
  return DELIVERY_PICKUP_LOCATION
}

/** Town / area label for driver package (inside vs outside province). */
export function resolveDriverPricingArea(pickupLocation: string) {
  if (pickupLocation.startsWith('Get to our location') || pickupLocation.includes('Bayombong')) {
    return OFFICE_DRIVER_AREA
  }
  if (pickupLocation.startsWith(DELIVERY_PICKUP_LOCATION)) {
    const parts = pickupLocation.split('—')
    const tail = parts.length > 1 ? parts[parts.length - 1]?.trim() : ''
    return tail || OFFICE_DRIVER_AREA
  }
  const parts = pickupLocation.split('—')
  const tail = parts[parts.length - 1]?.trim()
  return tail || OFFICE_DRIVER_AREA
}

export function parseFulfillmentFromPickupLocation(pickupLocation: string): {
  mode: FulfillmentMode
  deliveryArea: string
} {
  if (pickupLocation.startsWith('Get to our location') || pickupLocation.includes('our location —')) {
    return { mode: 'office', deliveryArea: OFFICE_DRIVER_AREA }
  }
  const area = resolveDriverPricingArea(pickupLocation)
  return { mode: 'delivery', deliveryArea: area }
}