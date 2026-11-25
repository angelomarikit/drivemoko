import * as Checkbox from '@radix-ui/react-checkbox'
import { CalendarDays, Check, Heart, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '@/components/common/StatusBadge'
import { VehicleAvailabilityModal } from '@/components/vehicles/VehicleAvailabilityModal'
import { VehicleImage } from '@/components/common/VehicleImage'
import { Button } from '@/components/ui/Button'
import { SelectInput, TextInput } from '@/components/ui/Fields'
import { useDemoActions, useSession, useSnapshot } from '@/hooks/useDemo'
import type { FuelType, Transmission, Vehicle, VehicleCategory } from '@/types'
import { isPubliclyBookable } from '@/utils/bookingRules'
import { formatPeso } from '@/utils/money'
import { formatRentalPriceRange, rentalPackageRateBounds, resolveRentalPackage } from '@/utils/rentalPackage'

const categories: Array<VehicleCategory | 'MPV/Van'> = ['SUV', 'Sedan', 'MPV/Van', 'Pickup', 'Others']

export function CarsPage() {
  const [params] = useSearchParams()
  const { data } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<string[]>(params.get('type') ? [params.get('type')!] : [])
  const [categoriesOn, setCategoriesOn] = useState<string[]>([])
  const [seats, setSeats] = useState<number[]>([])
  const [transmissions, setTransmissions] = useState<Transmission[]>([])
  const [fuels, setFuels] = useState<FuelType[]>([])
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [priceMin, setPriceMin] = useState(2000)
  const [priceMax, setPriceMax] = useState(8000)
  const [sort, setSort] = useState('recommended')
  const [availabilityVehicle, setAvailabilityVehicle] = useState<Vehicle | null>(null)
  const [applied, setApplied] = useState({
    types: params.get('type') ? [params.get('type')!] : [] as string[],
    categoriesOn: [] as string[],
    seats: [] as number[],
    transmissions: [] as Transmission[],
    fuels: [] as FuelType[],
    onlyAvailable: false,
    priceMin: 2000,
    priceMax: 8000,
    query: '',
  })

  const favoriteIds = new Set(
    (data?.favorites ?? []).filter((favorite) => favorite.userId === (session?.id ?? 'guest')).map((favorite) => favorite.vehicleId),
  )

  const vehicles = useMemo(() => {
    const rows = (data?.vehicles ?? []).filter((vehicle) => vehicle.listingStatus !== 'archived' && vehicle.listingStatus !== 'pending' && vehicle.listingStatus !== 'rejected')
    const filtered = rows.filter((vehicle) => {
      const categoryMatch =
        applied.categoriesOn.length === 0 ||
        applied.categoriesOn.some((category) => (category === 'MPV/Van' ? vehicle.category === 'MPV' || vehicle.category === 'Van' : vehicle.category === category))
      const typeMatch = applied.types.length === 0 || applied.types.some((type) => vehicle.offeredRentalTypes.includes(type as 'self-drive' | 'with-driver'))
      const seatMatch =
        applied.seats.length === 0 ||
        applied.seats.some((seat) => (seat === 12 ? vehicle.seats >= 12 : vehicle.seats === seat))
      const text = `${vehicle.name} ${vehicle.brand} ${vehicle.model}`.toLowerCase()
      return (
        categoryMatch &&
        typeMatch &&
        seatMatch &&
        (applied.transmissions.length === 0 || applied.transmissions.includes(vehicle.transmission)) &&
        (applied.fuels.length === 0 || applied.fuels.includes(vehicle.fuel)) &&
        (!applied.onlyAvailable || isPubliclyBookable(vehicle)) &&
        (() => {
          const bounds = rentalPackageRateBounds(resolveRentalPackage(vehicle, data!.settings))
          return bounds.max >= applied.priceMin && bounds.min <= applied.priceMax
        })() &&
        text.includes(query.toLowerCase())
      )
    })
    const sorted = [...filtered]
    if (sort === 'price-asc' && data) {
      sorted.sort(
        (a, b) =>
          rentalPackageRateBounds(resolveRentalPackage(a, data.settings)).min -
          rentalPackageRateBounds(resolveRentalPackage(b, data.settings)).min,
      )
    }
    if (sort === 'price-desc' && data) {
      sorted.sort(
        (a, b) =>
          rentalPackageRateBounds(resolveRentalPackage(b, data.settings)).max -
          rentalPackageRateBounds(resolveRentalPackage(a, data.settings)).max,
      )
    }
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'seats') sorted.sort((a, b) => b.seats - a.seats)
    return sorted
  }, [applied, data?.vehicles, query, sort])

  const bookableQuery = new URLSearchParams()
  if (params.get('pickup')) bookableQuery.set('pickup', params.get('pickup')!)
  if (params.get('return')) bookableQuery.set('return', params.get('return')!)
  if (params.get('type')) bookableQuery.set('type', params.get('type')!)
  if (params.get('location')) bookableQuery.set('location', params.get('location')!)
  const suffix = bookableQuery.toString() ? `?${bookableQuery.toString()}` : ''

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  return (
    <div className="bg-canvas pb-16">
      <section className="relative h-56 overflow-hidden bg-navy text-white">
        <img src="/hero-banner.jpg" alt="" className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/20" />
        <div className="absolute inset-0 mx-auto flex max-w-[1440px] items-center px-4">
          <div>
            <h1 className="text-4xl font-extrabold italic">Available Cars</h1>
            <p className="mt-2 max-w-md text-sm text-white/80">Choose from our wide selection of well-maintained vehicles for your trip in Nueva Vizcaya.</p>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 font-bold"><SlidersHorizontal className="h-4 w-4" /> Filter Search</p>
          <FilterGroup title="Rental Type">
            {[['self-drive', 'Self-Drive'], ['with-driver', 'With Driver']].map(([value, label]) => (
              <CheckRow key={value} checked={types.includes(value)} label={label} onChange={() => toggle(types, value, setTypes)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Vehicle Type">
            {categories.map((category) => (
              <CheckRow key={category} checked={categoriesOn.includes(category)} label={category} onChange={() => toggle(categoriesOn, category, setCategoriesOn)} />
            ))}
          </FilterGroup>
          <div className="mb-4">
            <p className="mb-2 text-sm font-bold">Price Range (per day)</p>
            <div className="relative h-6">
              <div className="absolute left-0 right-0 top-2 h-1 rounded bg-amber-100" />
              <input className="dual-range" type="range" min={1500} max={10000} step={100} value={priceMin} onChange={(event) => setPriceMin(Math.min(Number(event.target.value), priceMax - 100))} />
              <input className="dual-range" type="range" min={1500} max={10000} step={100} value={priceMax} onChange={(event) => setPriceMax(Math.max(Number(event.target.value), priceMin + 100))} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-muted">
              <span>{formatPeso(priceMin)}</span>
              <span>{formatPeso(priceMax)}</span>
            </div>
          </div>
          <FilterGroup title="Seating Capacity">
            {[5, 7, 10, 12].map((seat) => (
              <CheckRow key={seat} checked={seats.includes(seat)} label={seat === 12 ? '12 Seater and above' : `${seat} Seater`} onChange={() => toggle(seats, seat, setSeats)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Transmission">
            {(['Automatic', 'Manual'] as Transmission[]).map((item) => (
              <CheckRow key={item} checked={transmissions.includes(item)} label={item} onChange={() => toggle(transmissions, item, setTransmissions)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Fuel">
            {(['Diesel', 'Gasoline'] as FuelType[]).map((item) => (
              <CheckRow key={item} checked={fuels.includes(item)} label={item} onChange={() => toggle(fuels, item, setFuels)} />
            ))}
          </FilterGroup>
          <CheckRow checked={onlyAvailable} label="Available now" onChange={() => setOnlyAvailable((value) => !value)} />
          <Button className="mt-4 w-full" onClick={() => setApplied({ types, categoriesOn, seats, transmissions, fuels, onlyAvailable, priceMin, priceMax, query })}>Apply Filters</Button>
          <button
            className="mt-2 flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted"
            onClick={() => {
              setTypes([]); setCategoriesOn([]); setSeats([]); setTransmissions([]); setFuels([]); setOnlyAvailable(false); setPriceMin(2000); setPriceMax(8000); setQuery('')
              setApplied({ types: [], categoriesOn: [], seats: [], transmissions: [], fuels: [], onlyAvailable: false, priceMin: 2000, priceMax: 8000, query: '' })
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </aside>
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="font-semibold">Showing {vehicles.length} Vehicles</p>
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" className="sm:max-w-xs" />
            <div className="sm:ml-auto sm:w-52">
              <SelectInput value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort vehicles">
                <option value="recommended">Sort by: Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name</option>
                <option value="seats">Seating</option>
              </SelectInput>
            </div>
          </div>
          {vehicles.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center">
              <p className="font-bold">No vehicles match these filters</p>
              <p className="mt-1 text-sm text-muted">Reset the filters or widen the price range.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {vehicles.map((vehicle) => {
                const bookable = isPubliclyBookable(vehicle)
                const loved = favoriteIds.has(vehicle.id)
                return (
                  <article key={vehicle.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="relative">
                      <VehicleImage src={vehicle.images[0]} alt={vehicle.name} className="h-40 w-full" />
                      <span className="absolute left-3 top-3"><StatusBadge value={bookable ? 'available' : 'unavailable'} /></span>
                      <button
                        type="button"
                        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90"
                        onClick={() => actions.favorite(vehicle.id)}
                        aria-label="Favorite"
                      >
                        <Heart className={`h-4 w-4 ${loved ? 'fill-rose-500 text-rose-500' : 'text-ink'}`} />
                      </button>
                      <button
                        type="button"
                        className="absolute right-3 top-12 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink hover:text-info"
                        onClick={() => setAvailabilityVehicle(vehicle)}
                        aria-label="View availability"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold">{vehicle.name}</h2>
                      <p className="mt-1 text-xs text-muted">{vehicle.seats} Seater · {vehicle.transmission} · {vehicle.fuel}</p>
                      <p className="mt-2 text-lg font-extrabold text-[#f59e0b]">
                        {data ? formatRentalPriceRange(resolveRentalPackage(vehicle, data.settings), formatPeso) : formatPeso(vehicle.pricePerDay)}{' '}
                        <span className="text-xs font-semibold text-muted">/ day</span>
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button disabled={!bookable} onClick={() => navigate(`/book/${vehicle.id}${suffix}`)}>Book Now</Button>
                        <Button variant="outline" asChild><Link to={`/cars/${vehicle.id}${suffix}`}>View Details</Link></Button>
                      </div>
                      <button
                        type="button"
                        className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-info"
                        onClick={() => setAvailabilityVehicle(vehicle)}
                      >
                        <CalendarDays className="h-3.5 w-3.5" /> Availability calendar
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <VehicleAvailabilityModal vehicle={availabilityVehicle} open={!!availabilityVehicle} onClose={() => setAvailabilityVehicle(null)} />
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-bold">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function CheckRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox.Root checked={checked} onCheckedChange={onChange} className="grid h-4 w-4 place-items-center rounded border border-line data-[state=checked]:border-gold data-[state=checked]:bg-gold">
        <Checkbox.Indicator><Check className="h-3 w-3 text-ink" /></Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  )
}
