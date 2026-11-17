import type { Vehicle } from '@/types'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID_RE.test(value.trim())
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugCandidates(vehicle: Vehicle) {
  const brand = vehicle.brand.trim()
  const model = vehicle.model.trim()
  return [
    slugify(vehicle.id),
    slugify(vehicle.model),
    slugify(vehicle.name),
    slugify(`${brand}-${model}`),
    slugify(`${brand} ${model}`),
    model.toLowerCase(),
    vehicle.name.trim().toLowerCase(),
  ]
}

/** Match fleet row by primary key or human-readable URL segment (e.g. /cars/yaris). */
export function findVehicleByParam(vehicles: Vehicle[], param: string | undefined): Vehicle | undefined {
  if (!param?.trim()) return undefined
  const trimmed = param.trim()

  if (isUuid(trimmed)) {
    return vehicles.find((vehicle) => vehicle.id === trimmed)
  }

  const needle = slugify(trimmed)
  const bySlug = vehicles.find(
    (vehicle) => isUuid(vehicle.id) && slugCandidates(vehicle).includes(needle),
  )
  if (bySlug) return bySlug

  const byLegacyId = vehicles.find((vehicle) => vehicle.id === trimmed)
  if (byLegacyId) return byLegacyId

  return vehicles.find((vehicle) => slugCandidates(vehicle).includes(needle))
}

/**
 * Resolve to the live fleet row (UUID). Never returns legacy slug ids when a UUID match exists.
 */
export function resolveVehicleForBooking(vehicles: Vehicle[], param: string): Vehicle {
  const trimmed = param.trim()
  const match = findVehicleByParam(vehicles, trimmed)
  if (!match) throw new Error('Vehicle not found.')
  if (isUuid(match.id)) return match

  const uuidRows = vehicles.filter((vehicle) => isUuid(vehicle.id))
  const byPlate =
    match.plateNumber &&
    uuidRows.find(
      (vehicle) =>
        vehicle.plateNumber === match.plateNumber &&
        vehicle.brand === match.brand &&
        vehicle.model === match.model,
    )
  if (byPlate) return byPlate

  const needle = slugify(trimmed)
  const bySlug = uuidRows.find((vehicle) => slugCandidates(vehicle).includes(needle))
  if (bySlug) return bySlug

  if (uuidRows.length === 1 && !isUuid(trimmed)) {
    const sole = uuidRows[0]
    if (slugCandidates(sole).includes(needle)) return sole
  }

  throw new Error('This vehicle could not be matched in the fleet. Open it from Available Cars and book again.')
}