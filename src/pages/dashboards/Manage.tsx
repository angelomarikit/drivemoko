import { zodResolver } from '@hookform/resolvers/zod'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { z } from 'zod'
import { StatusBadge } from '@/components/common/StatusBadge'
import { VehicleImage } from '@/components/common/VehicleImage'
import { Panel } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { DateField, ErrorText, FieldLabel, SelectInput, TextArea, TextInput } from '@/components/ui/Fields'
import { Modal } from '@/components/ui/Modal'
import { useDemoActions, useSession, useSnapshot } from '@/hooks/useDemo'
import { useUiStore } from '@/stores/uiStore'
import type { Booking, BookingStatus, PaymentMethod, Role, User, Vehicle, VehicleCategory } from '@/types'
import { canTransition, isPubliclyBookable } from '@/utils/bookingRules'
import { cn } from '@/utils/cn'
import { addDays, formatPretty, manilaYmd } from '@/utils/dates'
import { fileToResizedDataUrl, downloadCsv } from '@/utils/files'
import { earningsTotal, scopedBookings, scopedVehicles, shareAmount, statusCounts, utilization } from '@/utils/metrics'
import { formatPeso } from '@/utils/money'
import { emptyAddons } from '@/utils/pricing'

const vehicleSchema = z.object({
  name: z.string().min(2),
  brand: z.string().min(2),
  model: z.string().min(1),
  year: z.coerce.number().min(2005).max(2035),
  category: z.enum(['SUV', 'Sedan', 'MPV', 'Van', 'Pickup', 'Others']),
  seats: z.coerce.number().min(2).max(18),
  transmission: z.enum(['Automatic', 'Manual']),
  fuel: z.enum(['Diesel', 'Gasoline']),
  pricePerDay: z.coerce.number().min(500),
  plateNumber: z.string().min(2),
  description: z.string().min(10),
  ownerId: z.string().optional(),
  partnerId: z.string().optional(),
  listingStatus: z.enum(['approved', 'pending', 'rejected', 'archived']),
  listingActive: z.boolean(),
  airconditioning: z.boolean(),
  selfDrive: z.boolean(),
  withDriver: z.boolean(),
  features: z.string().min(2),
})

type VehicleForm = z.infer<typeof vehicleSchema>

export function BookingsBoard({ mode }: { mode: Role }) {
  const { data } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const ask = useUiStore((state) => state.askConfirm)
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(params.get('new') === '1')
  const [draft, setDraft] = useState({ customerId: '', vehicleId: '', pickupDate: manilaYmd(), returnDate: manilaYmd(), pickupTime: '08:00', returnTime: '18:00', location: 'Nueva Vizcaya', rentalType: 'self-drive' as const })
  useEffect(() => {
    if (params.get('new') !== '1') return
    const pickup = params.get('pickup')
    const returnDate = params.get('return')
    const vehicleId = params.get('vehicleId')
    setCreating(true)
    setDraft((current) => ({
      ...current,
      pickupDate: pickup && pickup >= manilaYmd() ? pickup : current.pickupDate,
      returnDate: returnDate && returnDate >= (pickup ?? current.pickupDate) ? returnDate : current.returnDate,
      vehicleId: vehicleId ?? current.vehicleId,
    }))
  }, [params])
  if (!data || !session) return null
  const rows = scopedBookings(data.bookings, data.vehicles, mode, session.id).filter((booking) => {
    const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId)
    const customer = data.users.find((user) => user.id === booking.customerId)
    const text = `${booking.reference} ${vehicle?.name ?? ''} ${customer?.name ?? ''}`.toLowerCase()
    return (status === 'all' || booking.status === status) && text.includes(search.toLowerCase())
  })
  const openId = params.get('open')
  const opened = data.bookings.find((booking) => booking.id === openId) ?? null
  const columns = useMemo<ColumnDef<Booking>[]>(() => [
    { accessorKey: 'reference', header: 'Booking No.' },
    { id: 'customer', header: 'Customer', cell: ({ row }) => data.users.find((user) => user.id === row.original.customerId)?.name },
    { id: 'vehicle', header: 'Vehicle', cell: ({ row }) => data.vehicles.find((vehicle) => vehicle.id === row.original.vehicleId)?.name },
    { id: 'period', header: 'Rental Period', cell: ({ row }) => `${formatPretty(row.original.pickupDate)} – ${formatPretty(row.original.returnDate)}` },
    { id: 'amount', header: 'Amount', cell: ({ row }) => formatPeso(row.original.pricing.total) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
    { accessorKey: 'paymentStatus', header: 'Payment', cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
    { id: 'actions', header: '', cell: ({ row }) => <button className="text-xs font-bold text-info" onClick={() => setParams({ open: row.original.id })}>View</button> },
  ], [data.users, data.vehicles, setParams])

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <h1 className="text-xl font-extrabold">{mode === 'partner' ? 'Reservations' : 'Bookings'}</h1>
        <div className="flex gap-1 overflow-x-auto text-xs font-bold">
          {['all', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'rejected'].map((item) => (
            <button key={item} className={`rounded-full px-3 py-1 capitalize ${status === item ? 'bg-gold' : 'bg-canvas'}`} onClick={() => setStatus(item)}>{item}</button>
          ))}
        </div>
        <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="lg:ml-auto lg:max-w-xs" />
        {mode === 'admin' ? <Button onClick={() => setCreating(true)}>Create booking</Button> : null}
      </div>
      <SimpleTable columns={columns} data={rows} />
      <Modal open={!!opened} onClose={() => setParams({})} title={opened?.reference ?? 'Booking'} wide>
        {opened ? <BookingDetail booking={opened} mode={mode} /> : null}
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Create booking" description="The request stays pending until it is confirmed.">
        <div className="grid gap-3 md:grid-cols-2">
          <label><FieldLabel>Customer</FieldLabel><SelectInput value={draft.customerId} onChange={(event) => setDraft({ ...draft, customerId: event.target.value })}><option value="">Select</option>{data.users.filter((user) => user.role === 'customer').map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</SelectInput></label>
          <label><FieldLabel>Vehicle</FieldLabel><SelectInput value={draft.vehicleId} onChange={(event) => setDraft({ ...draft, vehicleId: event.target.value })}><option value="">Select</option>{data.vehicles.filter((vehicle) => vehicle.listingActive).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</SelectInput></label>
          <DateField label="Pickup" value={draft.pickupDate} onChange={(pickupDate) => setDraft({ ...draft, pickupDate })} disablePast />
          <DateField label="Return" value={draft.returnDate} onChange={(returnDate) => setDraft({ ...draft, returnDate })} disablePast />
          <label><FieldLabel>Pickup time</FieldLabel><TextInput type="time" value={draft.pickupTime} onChange={(event) => setDraft({ ...draft, pickupTime: event.target.value })} /></label>
          <label><FieldLabel>Return time</FieldLabel><TextInput type="time" value={draft.returnTime} onChange={(event) => setDraft({ ...draft, returnTime: event.target.value })} /></label>
        </div>
        <Button className="mt-4" onClick={async () => {
          const customer = data.users.find((user) => user.id === draft.customerId)
          if (!customer) return
          const booking = await actions.createBooking({
            vehicleId: draft.vehicleId,
            customerId: customer.id,
            customer: { name: customer.name, email: customer.email, phone: customer.phone, address: customer.address },
            pickupLocation: draft.location,
            pickupDate: draft.pickupDate,
            returnDate: draft.returnDate,
            pickupTime: draft.pickupTime,
            returnTime: draft.returnTime,
            rentalType: draft.rentalType,
            addons: emptyAddons(),
            specialRequest: '',
          })
          if (booking) setCreating(false)
        }}>Save request</Button>
      </Modal>
      <span className="hidden">{String(ask)}</span>
    </Panel>
  )
}

function BookingDetail({ booking, mode }: { booking: Booking; mode: Role }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const ask = useUiStore((state) => state.askConfirm)
  const [note, setNote] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  if (!data) return null
  const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId)
  const customer = data.users.find((user) => user.id === booking.customerId)
  const owner = data.users.find((user) => user.id === vehicle?.ownerId)
  const partner = data.users.find((user) => user.id === vehicle?.partnerId)
  const payments = data.payments.filter((payment) => payment.bookingId === booking.id)
  const act = (status: BookingStatus) => {
    const run = () => actions.transition(booking.id, status, note)
    if (status === 'cancelled' || status === 'rejected') ask({ title: `${status === 'cancelled' ? 'Cancel' : 'Reject'} booking?`, message: `${booking.reference} will release its dates.`, confirmLabel: status === 'cancelled' ? 'Cancel booking' : 'Reject', tone: 'danger', onConfirm: run })
    else run()
  }
  return (
    <div className="grid gap-4 text-sm lg:grid-cols-2">
      <div className="space-y-1">
        <p><strong>Customer:</strong> {customer?.name} · {customer?.phone}</p>
        <p><strong>Vehicle:</strong> {vehicle?.name} · {vehicle?.plateNumber}</p>
        <p><strong>Owner:</strong> {owner?.name ?? 'Company fleet'}</p>
        <p><strong>Partner:</strong> {partner?.name ?? 'None'}</p>
        <p><strong>Schedule:</strong> {formatPretty(booking.pickupDate)} {booking.pickupTime} – {formatPretty(booking.returnDate)} {booking.returnTime}</p>
        <p><strong>Type:</strong> {booking.rentalType}</p>
        <p><strong>Total:</strong> {formatPeso(booking.pricing.total)} · <StatusBadge value={booking.paymentStatus} /></p>
        <p><strong>Notes:</strong> {booking.notes || 'None'}</p>
        {booking.specialRequest ? <p><strong>Request:</strong> {booking.specialRequest}</p> : null}
      </div>
      <div>
        <p className="font-bold">History</p>
        <ul className="mt-2 space-y-1">{booking.history.map((entry) => <li key={entry.id}>{entry.action} · {entry.by}</li>)}</ul>
        <p className="mt-3 font-bold">Payments</p>
        {payments.map((payment) => <p key={payment.id}>{payment.method} · {formatPeso(payment.amount)} · {payment.status}</p>)}
      </div>
      <div className="lg:col-span-2">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for this action" />
        <div className="mt-3 flex flex-wrap gap-2">
          {mode === 'admin' ? canTransition(booking.status, 'confirmed') && <Button onClick={() => act('confirmed')}>Approve</Button> : null}
          {mode === 'admin' ? canTransition(booking.status, 'rejected') && <Button variant="danger" onClick={() => act('rejected')}>Reject</Button> : null}
          {mode === 'admin' && canTransition(booking.status, 'ongoing') ? <Button onClick={() => act('ongoing')}>Mark released</Button> : null}
          {mode === 'admin' && canTransition(booking.status, 'completed') ? <Button onClick={() => act('completed')}>Mark returned</Button> : null}
          {(mode === 'admin' || mode === 'customer') && canTransition(booking.status, 'cancelled') ? <Button variant="outline" onClick={() => act('cancelled')}>{mode === 'customer' ? 'Request cancellation' : 'Cancel'}</Button> : null}
          {mode === 'admin' ? <Button variant="soft" onClick={() => setPayOpen(true)}>Record payment</Button> : null}
        </div>
      </div>
      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} bookingId={booking.id} />
    </div>
  )
}

export function VehiclesBoard({ mode }: { mode: 'admin' | 'owner' | 'partner' }) {
  const { data } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const ask = useUiStore((state) => state.askConfirm)
  const [params] = useSearchParams()
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(params.get('new') === '1' ? 'new' : null)
  const [blockFor, setBlockFor] = useState<string>('')
  if (!data || !session) return null
  const vehicles = scopedVehicles(data.vehicles, mode, session.id).filter((vehicle) => mode === 'admin' || vehicle.listingStatus !== 'archived')
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Vehicles</h1>
        <Button onClick={() => setEditing('new')}>{mode === 'partner' ? 'Submit vehicle' : 'Add vehicle'}</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Vehicle</th><th>Type</th><th>Rate</th><th>Listing</th><th>Owner</th><th></th></tr></thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-t">
                <td className="py-2"><span className="flex items-center gap-2"><VehicleImage src={vehicle.images[0]} alt="" className="h-10 w-14 rounded-lg" />{vehicle.name}</span></td>
                <td>{vehicle.category} · {vehicle.seats}</td>
                <td>{formatPeso(vehicle.pricePerDay)}</td>
                <td><StatusBadge value={vehicle.listingStatus} /></td>
                <td>{data.users.find((user) => user.id === vehicle.ownerId)?.name ?? 'Fleet'}</td>
                <td className="space-x-2 text-xs font-bold">
                  <button className="text-info" onClick={() => setEditing(vehicle)}>Edit</button>
                  <button onClick={() => setBlockFor(vehicle.id)}>Block dates</button>
                  {mode === 'admin' ? <button className="text-danger" onClick={() => ask({ title: 'Archive vehicle?', message: `${vehicle.name} will leave the public catalog.`, confirmLabel: 'Archive', tone: 'danger', onConfirm: () => actions.archiveVehicle(vehicle.id) })}>Archive</button> : null}
                  {mode === 'admin' && vehicle.listingStatus === 'pending' ? <button className="text-success" onClick={() => actions.updateVehicle(vehicle.id, { listingStatus: 'approved', listingActive: true })}>Approve</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VehicleDialog key={editing === 'new' ? 'new' : editing?.id ?? 'closed'} vehicle={editing} onClose={() => setEditing(null)} mode={mode} />
      <BlockDialog vehicleId={blockFor} onClose={() => setBlockFor('')} />
    </Panel>
  )
}

function VehicleDialog({ vehicle, onClose, mode }: { vehicle: Vehicle | 'new' | null; onClose: () => void; mode: string }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const current = vehicle && vehicle !== 'new' ? vehicle : null
  const [images, setImages] = useState<string[]>(current?.images ?? [])
  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: current?.name ?? '',
      brand: current?.brand ?? 'Toyota',
      model: current?.model ?? '',
      year: current?.year ?? 2024,
      category: current?.category ?? 'SUV',
      seats: current?.seats ?? 5,
      transmission: current?.transmission ?? 'Automatic',
      fuel: current?.fuel ?? 'Gasoline',
      pricePerDay: current?.pricePerDay ?? 3000,
      plateNumber: current?.plateNumber ?? '',
      description: current?.description ?? 'Demonstration vehicle prepared for the Drive Moko catalog.',
      ownerId: current?.ownerId ?? '',
      partnerId: current?.partnerId ?? '',
      listingStatus: current?.listingStatus ?? (mode === 'admin' ? 'approved' : 'pending'),
      listingActive: current?.listingActive ?? mode === 'admin',
      airconditioning: current?.airconditioning ?? true,
      selfDrive: current?.offeredRentalTypes.includes('self-drive') ?? true,
      withDriver: current?.offeredRentalTypes.includes('with-driver') ?? true,
      features: current?.features.join(', ') ?? 'Airconditioning, Bluetooth',
    },
  })
  if (!data) return null
  return (
    <Modal open={!!vehicle} onClose={onClose} title={current ? 'Edit vehicle' : 'Add vehicle'} wide>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(async (values) => {
        const payload = {
          ...values,
          ownerId: values.ownerId || null,
          partnerId: values.partnerId || null,
          images: images.length ? images : ['/vehicles/fortuner.jpg'],
          features: values.features.split(',').map((item) => item.trim()).filter(Boolean),
          inclusions: current?.inclusions ?? ['Well-maintained vehicle', 'Basic insurance coverage', '24/7 booking support'],
          offeredRentalTypes: [values.selfDrive ? 'self-drive' as const : null, values.withDriver ? 'with-driver' as const : null].filter((item): item is 'self-drive' | 'with-driver' => !!item),
          category: values.category as VehicleCategory,
        }
        const saved = current ? await actions.updateVehicle(current.id, payload) : await actions.createVehicle(payload)
        if (saved) onClose()
      })}>
        <Section title="Vehicle information" />
        <label><FieldLabel>Name</FieldLabel><TextInput {...form.register('name')} /></label>
        <label><FieldLabel>Brand</FieldLabel><TextInput {...form.register('brand')} /></label>
        <label><FieldLabel>Model</FieldLabel><TextInput {...form.register('model')} /></label>
        <label><FieldLabel>Year</FieldLabel><TextInput type="number" {...form.register('year')} /></label>
        <label><FieldLabel>Plate</FieldLabel><TextInput {...form.register('plateNumber')} /></label>
        <label className="md:col-span-2"><FieldLabel>Description</FieldLabel><TextArea {...form.register('description')} /></label>
        <Section title="Specifications" />
        <label><FieldLabel>Type</FieldLabel><SelectInput {...form.register('category')}>{['SUV', 'Sedan', 'MPV', 'Van', 'Pickup', 'Others'].map((item) => <option key={item}>{item}</option>)}</SelectInput></label>
        <label><FieldLabel>Seats</FieldLabel><TextInput type="number" {...form.register('seats')} /></label>
        <label><FieldLabel>Transmission</FieldLabel><SelectInput {...form.register('transmission')}><option>Automatic</option><option>Manual</option></SelectInput></label>
        <label><FieldLabel>Fuel</FieldLabel><SelectInput {...form.register('fuel')}><option>Gasoline</option><option>Diesel</option></SelectInput></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('airconditioning')} /> Airconditioning</label>
        <label><FieldLabel>Features</FieldLabel><TextInput {...form.register('features')} /></label>
        <Section title="Rental pricing" />
        <label><FieldLabel>Daily rate</FieldLabel><TextInput type="number" {...form.register('pricePerDay')} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('selfDrive')} /> Self-drive</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('withDriver')} /> With driver</label>
        {mode === 'admin' ? (
          <>
            <Section title="Ownership" />
            <label><FieldLabel>Owner</FieldLabel><SelectInput {...form.register('ownerId')}><option value="">Company fleet</option>{data.users.filter((user) => user.role === 'owner').map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</SelectInput></label>
            <label><FieldLabel>Partner</FieldLabel><SelectInput {...form.register('partnerId')}><option value="">None</option>{data.users.filter((user) => user.role === 'partner').map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</SelectInput></label>
            <Section title="Listing status" />
            <label><FieldLabel>Status</FieldLabel><SelectInput {...form.register('listingStatus')}><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="archived">Archived</option></SelectInput></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('listingActive')} /> Active on the public catalog</label>
          </>
        ) : null}
        <Section title="Images" />
        <label className="md:col-span-2 text-sm">Upload a demo preview
          <input className="mt-1 block" type="file" accept="image/*" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const url = await fileToResizedDataUrl(file)
            setImages((currentImages) => [...currentImages, url].slice(0, 6))
          }} />
        </label>
        <div className="flex gap-2 md:col-span-2">{images.map((image) => <VehicleImage key={image.slice(0, 24)} src={image} alt="" className="h-16 w-24 rounded-lg" />)}</div>
        {Object.values(form.formState.errors).map((error) => <ErrorText key={error?.message}>{error?.message}</ErrorText>)}
        <Button type="submit" className="md:col-span-2">Save vehicle</Button>
      </form>
    </Modal>
  )
}

function Section({ title }: { title: string }) {
  return <h3 className="md:col-span-2 mt-2 text-sm font-extrabold">{title}</h3>
}

function BlockDialog({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const [startDate, setStart] = useState(manilaYmd())
  const [endDate, setEnd] = useState(manilaYmd())
  const [reason, setReason] = useState('Maintenance')
  const blocks = (data?.maintenance ?? []).filter((item) => item.vehicleId === vehicleId)
  return (
    <Modal open={!!vehicleId} onClose={onClose} title="Block dates">
      <div className="grid gap-3 md:grid-cols-2">
        <DateField label="First unavailable day" value={startDate} onChange={setStart} />
        <DateField label="Last unavailable day" value={endDate} onChange={setEnd} />
      </div>
      <label className="mt-3 block"><FieldLabel>Reason</FieldLabel><TextInput value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <Button className="mt-3" onClick={async () => { await actions.addMaintenance({ vehicleId, startDate, endDate, reason }); onClose() }}>Save block</Button>
      <div className="mt-4 space-y-2 text-sm">
        {blocks.map((block) => (
          <div key={block.id} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2">
            <span>{block.startDate} – {block.endDate} · {block.reason}</span>
            <button className="text-xs font-bold text-danger" onClick={() => actions.removeMaintenance(block.id)}>Remove</button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

type FcView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

function inclusiveReturnFromSelect(startStr: string, endStr: string, allDay: boolean) {
  const pickup = startStr.slice(0, 10)
  let endYmd = endStr.slice(0, 10)
  if (allDay) endYmd = addDays(endYmd, -1)
  if (endYmd < pickup) endYmd = pickup
  return { pickup, returnDate: endYmd }
}

export function CalendarBoard({ mode }: { mode: Role }) {
  const { data } = useSnapshot()
  const session = useSession()
  const navigate = useNavigate()
  const calendarRef = useRef<FullCalendar>(null)
  const [vehicleId, setVehicleId] = useState('all')
  const [ownerId, setOwnerId] = useState('all')
  const [partnerId, setPartnerId] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [calView, setCalView] = useState<FcView>('dayGridMonth')
  const [bookDraft, setBookDraft] = useState<{ pickup: string; returnDate: string; vehicleId: string } | null>(null)
  if (!data || !session) return null
  let bookings = scopedBookings(data.bookings, data.vehicles, mode, session.id)
  let vehicles = scopedVehicles(data.vehicles, mode, session.id)
  if (vehicleId !== 'all') {
    bookings = bookings.filter((booking) => booking.vehicleId === vehicleId)
    vehicles = vehicles.filter((vehicle) => vehicle.id === vehicleId)
  }
  if (ownerId !== 'all') vehicles = vehicles.filter((vehicle) => vehicle.ownerId === ownerId)
  if (partnerId !== 'all') vehicles = vehicles.filter((vehicle) => vehicle.partnerId === partnerId)
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id))
  bookings = bookings.filter((booking) => vehicleIds.has(booking.vehicleId))
  const bookableVehicles = vehicles.filter((vehicle) => isPubliclyBookable(vehicle))
  const vehicleName = (id: string) => data.vehicles.find((vehicle) => vehicle.id === id)?.name ?? 'Vehicle'
  const events = bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.reference} · ${vehicleName(booking.vehicleId)}`,
    start: booking.pickupDate,
    end: addDays(booking.returnDate, 1),
    allDay: true,
    color:
      booking.status === 'pending' ? '#1a73e8' : booking.status === 'confirmed' ? '#188038' : booking.status === 'ongoing' ? '#e37400' : '#5f6368',
    textColor: '#ffffff',
  }))

  const changeCalendarView = (view: FcView) => {
    setCalView(view)
    calendarRef.current?.getApi().changeView(view)
  }

  const startBookFlow = (pickup: string, returnDate: string, preVehicleId?: string) => {
    if (pickup < manilaYmd()) {
      toast.error('Choose today or a future date.')
      return
    }
    const defaultVehicle = preVehicleId ?? (vehicleId !== 'all' ? vehicleId : bookableVehicles[0]?.id ?? '')
    setBookDraft({ pickup, returnDate, vehicleId: defaultVehicle })
  }

  const continueCustomerBooking = () => {
    if (!bookDraft?.vehicleId) {
      toast.error('Pick a vehicle to continue.')
      return
    }
    const params = new URLSearchParams({
      pickup: bookDraft.pickup,
      return: bookDraft.returnDate,
      location: 'Nueva Vizcaya',
    })
    setBookDraft(null)
    calendarRef.current?.getApi().unselect()
    navigate(`/book/${bookDraft.vehicleId}?${params.toString()}`)
  }

  const opened = bookings.find((booking) => booking.id === openId) ?? null

  return (
    <Panel className="p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h1 className="text-lg font-bold text-ink">Calendar</h1>
        <p className="w-full text-xs text-slate-600 sm:w-auto sm:flex-1">Drag on empty days to pick rental dates — same flow as the public booking form.</p>
        <Button variant="navy" className="shrink-0" onClick={() => startBookFlow(manilaYmd(), addDays(manilaYmd(), 2))}>
          Book rental
        </Button>
        <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 text-xs font-semibold">
          {([
            ['dayGridMonth', 'Month'],
            ['timeGridWeek', 'Week'],
            ['timeGridDay', 'Day'],
          ] as const).map(([view, label]) => (
            <button
              key={view}
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-slate-700',
                calView === view && 'bg-white text-[#1967d2] shadow-sm ring-1 ring-slate-200',
              )}
              onClick={() => changeCalendarView(view)}
            >
              {label}
            </button>
          ))}
        </div>
        <SelectInput className="max-w-40" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
          <option value="all">All vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name}
            </option>
          ))}
        </SelectInput>
        {mode === 'admin' ? (
          <SelectInput className="max-w-40" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="all">All owners</option>
            {data.users.filter((user) => user.role === 'owner').map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </SelectInput>
        ) : null}
        {mode === 'admin' ? (
          <SelectInput className="max-w-40" value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
            <option value="all">All partners</option>
            {data.users.filter((user) => user.role === 'partner').map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </SelectInput>
        ) : null}
      </div>
      <div className="dm-fc dm-fc--google min-h-[32rem] bg-white px-3 pb-4 pt-2">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          events={events}
          height="auto"
          fixedWeekCount={false}
          dayMaxEventRows={3}
          selectable
          selectMirror
          unselectAuto
          selectOverlap={false}
          longPressDelay={0}
          select={(info) => {
            const { pickup, returnDate } = inclusiveReturnFromSelect(info.startStr, info.endStr, info.allDay)
            startBookFlow(pickup, returnDate)
          }}
          dateClick={(info) => {
            if (info.dateStr < manilaYmd()) return
            startBookFlow(info.dateStr, info.dateStr)
          }}
          eventClick={(info) => {
            if (bookings.some((booking) => booking.id === info.event.id)) setOpenId(info.event.id)
          }}
        />
      </div>
      <Modal
        open={!!bookDraft}
        onClose={() => {
          setBookDraft(null)
          calendarRef.current?.getApi().unselect()
        }}
        title="Book rental"
        description="Continue to the same 4-step booking form customers use on the public site."
      >
        {bookDraft ? (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{formatPretty(bookDraft.pickup)}</strong>
              {bookDraft.returnDate !== bookDraft.pickup ? (
                <>
                  {' '}
                  → <strong>{formatPretty(bookDraft.returnDate)}</strong>
                </>
              ) : null}
            </p>
            <label className="block text-sm">
              <FieldLabel required>Vehicle</FieldLabel>
              <SelectInput value={bookDraft.vehicleId} onChange={(event) => setBookDraft({ ...bookDraft, vehicleId: event.target.value })}>
                <option value="">Select vehicle</option>
                {bookableVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </SelectInput>
            </label>
            <p className="text-xs text-muted">Pending requests appear on the calendar once submitted.</p>
            <p className="text-xs text-muted">Pickup and return times default to 08:00 and 18:00 on the booking form.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={continueCustomerBooking}>Continue to booking</Button>
              {mode === 'admin' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!bookDraft.vehicleId) {
                      toast.error('Pick a vehicle first.')
                      return
                    }
                    const params = new URLSearchParams({
                      new: '1',
                      pickup: bookDraft.pickup,
                      return: bookDraft.returnDate,
                      vehicleId: bookDraft.vehicleId,
                    })
                    setBookDraft(null)
                    calendarRef.current?.getApi().unselect()
                    navigate(`/admin/bookings?${params.toString()}`)
                  }}
                >
                  Quick admin request
                </Button>
              ) : null}
              {session.role === 'customer' ? (
                <Button variant="outline" onClick={() => navigate('/cars')}>
                  Browse all cars
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal open={!!opened} onClose={() => setOpenId(null)} title={opened?.reference ?? ''} wide>
        {opened ? <BookingDetail booking={opened} mode={mode} /> : null}
      </Modal>
    </Panel>
  )
}

export function PeopleBoard({ kind }: { kind: 'owners' | 'partners' | 'customers' }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(params.get('new') === '1')
  const [selected, setSelected] = useState<User | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', shareRate: '70' })
  if (!data) return null
  const role = kind === 'owners' ? 'owner' : kind === 'partners' ? 'partner' : 'customer'
  const people = data.users.filter((user) => user.role === role && `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()))
  const application = data.applications.find((item) => item.id === applicationId)
  return (
    <div className="space-y-4">
      {kind === 'partners' ? (
        <Panel>
          <h2 className="font-bold">Applications</h2>
          <div className="mt-3 space-y-2">
            {data.applications.map((item) => (
              <button key={item.id} className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm" onClick={() => setApplicationId(item.id)}>
                <span>{item.fullName} · {item.vehicleDetails}</span>
                <StatusBadge value={item.status} />
              </button>
            ))}
          </div>
        </Panel>
      ) : null}
      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold capitalize">{kind}</h1>
          <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="ml-auto max-w-xs" />
          {kind !== 'customers' ? <Button onClick={() => setOpen(true)}>Add {role}</Button> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th>Name</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-t">
                  <td className="py-2 font-semibold">{person.name}<span className="block text-xs font-normal text-muted">{person.email}</span></td>
                  <td>{person.phone}</td>
                  <td><StatusBadge value={person.status} /></td>
                  <td className="space-x-2 text-xs font-bold">
                    <button className="text-info" onClick={() => setSelected(person)}>Profile</button>
                    <button onClick={() => actions.updateUser(person.id, { status: person.status === 'active' ? 'suspended' : 'active' })}>{person.status === 'active' ? 'Suspend' : 'Reactivate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Modal open={open} onClose={() => setOpen(false)} title={`Add ${role}`}>
        <div className="grid gap-3">
          <TextInput placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <TextInput placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <TextInput placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <TextInput placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          {kind === 'partners' ? <TextInput placeholder="Share rate" type="number" value={form.shareRate} onChange={(event) => setForm({ ...form, shareRate: event.target.value })} /> : null}
          <Button onClick={async () => {
            const created = await actions.createUser({ role, name: form.name, email: form.email, phone: form.phone, address: form.address, shareRate: Number(form.shareRate) })
            if (created) setOpen(false)
          }}>Save</Button>
        </div>
      </Modal>
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} wide>
        {selected ? <PersonProfile person={selected} /> : null}
      </Modal>
      <Modal open={!!application} onClose={() => setApplicationId(null)} title="Partner application">
        {application ? (
          <div className="space-y-2 text-sm">
            <p>{application.fullName} · {application.email} · {application.phone}</p>
            <p>{application.address}</p>
            <p>{application.vehicleDetails}</p>
            <p>{application.ownershipType} · {application.vehicleCount} vehicle(s)</p>
            <p>{application.notes}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => actions.reviewApplication(application.id, 'approved', data.settings.defaultPartnerShare).then(() => setApplicationId(null))}>Approve</Button>
              <Button variant="danger" onClick={() => actions.reviewApplication(application.id, 'rejected').then(() => setApplicationId(null))}>Reject</Button>
              <Button variant="outline" onClick={() => actions.reviewApplication(application.id, 'needs_info', undefined, 'Please send clearer vehicle details.').then(() => setApplicationId(null))}>Request info</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function PersonProfile({ person }: { person: User }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const [notes, setNotes] = useState(person.notes ?? '')
  const [share, setShare] = useState(String(person.shareRate ?? ''))
  if (!data) return null
  const vehicles = data.vehicles.filter((vehicle) => vehicle.ownerId === person.id || vehicle.partnerId === person.id)
  const bookings = data.bookings.filter((booking) => booking.customerId === person.id || vehicles.some((vehicle) => vehicle.id === booking.vehicleId))
  const spend = bookings.filter((booking) => booking.customerId === person.id && booking.paymentStatus === 'paid').reduce((sum, booking) => sum + booking.pricing.total, 0)
  return (
    <div className="space-y-3 text-sm">
      <p>{person.email} · {person.phone}</p>
      <p>{person.address}</p>
      <p>Paid rentals: {formatPeso(spend)}</p>
      <p className="font-bold">Vehicles</p>
      {vehicles.map((vehicle) => <p key={vehicle.id}>{vehicle.name} · {formatPeso(vehicle.pricePerDay)}</p>)}
      <p className="font-bold">Bookings</p>
      {bookings.slice(0, 6).map((booking) => <p key={booking.id}>{booking.reference} · <StatusBadge value={booking.status} /></p>)}
      {person.role === 'partner' ? <label>Share rate %<TextInput value={share} onChange={(event) => setShare(event.target.value)} /></label> : null}
      <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Button onClick={() => actions.updateUser(person.id, { notes, shareRate: person.role === 'partner' ? Number(share) : undefined })}>Save profile</Button>
    </div>
  )
}

export function PaymentsBoard() {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(params.get('new') === '1')
  const [filter, setFilter] = useState('all')
  if (!data) return null
  const rows = data.payments.filter((payment) => filter === 'all' || payment.status === filter)
  const verified = data.payments.filter((payment) => payment.status === 'verified').reduce((sum, payment) => sum + payment.amount, 0)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Panel><p className="text-sm text-muted">Verified</p><p className="text-2xl font-extrabold">{formatPeso(verified)}</p></Panel>
        <Panel><p className="text-sm text-muted">Pending checks</p><p className="text-2xl font-extrabold">{data.payments.filter((payment) => payment.status === 'pending').length}</p></Panel>
        <Panel><p className="text-sm text-muted">Rejected</p><p className="text-2xl font-extrabold">{data.payments.filter((payment) => payment.status === 'rejected').length}</p></Panel>
      </div>
      <Panel>
        <div className="mb-3 flex gap-2">
          {['all', 'pending', 'verified', 'rejected'].map((item) => <button key={item} className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${filter === item ? 'bg-gold' : 'bg-canvas'}`} onClick={() => setFilter(item)}>{item}</button>)}
          <Button className="ml-auto" onClick={() => setOpen(true)}>Record payment</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th>Reference</th><th>Booking</th><th>Method</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((payment) => {
                const booking = data.bookings.find((item) => item.id === payment.bookingId)
                return (
                  <tr key={payment.id} className="border-t">
                    <td className="py-2">{payment.reference}</td>
                    <td>{booking?.reference}</td>
                    <td className="capitalize">{payment.method}</td>
                    <td>{formatPeso(payment.amount)}</td>
                    <td><StatusBadge value={payment.status} /></td>
                    <td className="space-x-2 text-xs font-bold">
                      {payment.status === 'pending' ? <button className="text-success" onClick={() => actions.verifyPayment(payment.id)}>Verify</button> : null}
                      {payment.status === 'pending' ? <button className="text-danger" onClick={() => actions.rejectPayment(payment.id, 'Demo rejection')}>Reject</button> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <PaymentDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function PaymentDialog({ open, onClose, bookingId }: { open: boolean; onClose: () => void; bookingId?: string }) {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const [form, setForm] = useState({ bookingId: bookingId ?? '', amount: '', method: 'cash' as PaymentMethod, reference: '', note: '', markVerified: true })
  if (!data) return null
  return (
    <Modal open={open} onClose={onClose} title="Record payment" description="Cash, GCash, Maya, or bank transfer. Nothing is charged for real.">
      <div className="grid gap-3">
        <SelectInput value={form.bookingId} onChange={(event) => setForm({ ...form, bookingId: event.target.value })}>
          <option value="">Booking</option>
          {data.bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.reference}</option>)}
        </SelectInput>
        <TextInput type="number" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        <SelectInput value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as PaymentMethod })}>
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank">Bank transfer</option>
        </SelectInput>
        <TextInput placeholder="Reference" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
        <TextArea placeholder="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.markVerified} onChange={(event) => setForm({ ...form, markVerified: event.target.checked })} /> Mark verified now</label>
        <Button onClick={async () => {
          const saved = await actions.recordPayment({ bookingId: form.bookingId, amount: Number(form.amount), method: form.method, reference: form.reference, note: form.note, markVerified: form.markVerified })
          if (saved) onClose()
        }}>Save payment</Button>
      </div>
    </Modal>
  )
}

export function ReportsBoard({ mode }: { mode: Role }) {
  const { data } = useSnapshot()
  const session = useSession()
  const [start, setStart] = useState('2026-09-01')
  const [end, setEnd] = useState('2026-11-30')
  if (!data || !session) return null
  const viewer = { role: mode, id: session.id }
  const bookings = scopedBookings(data.bookings, data.vehicles, mode, session.id).filter((booking) => booking.pickupDate >= start && booking.pickupDate <= end)
  const vehicles = scopedVehicles(data.vehicles, mode, session.id)
  const counts = statusCounts(bookings)
  const byVehicle = vehicles.map((vehicle) => ({
    name: vehicle.model,
    count: bookings.filter((booking) => booking.vehicleId === vehicle.id && !['cancelled', 'rejected'].includes(booking.status)).length,
  })).sort((a, b) => b.count - a.count)
  const earnings = earningsTotal(bookings, data.vehicles, data.users, data.settings, viewer)
  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap gap-3">
        <DateField label="From" value={start} onChange={setStart} />
        <DateField label="To" value={end} onChange={setEnd} />
      </Panel>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel><p className="text-sm text-muted">Bookings in range</p><p className="text-2xl font-extrabold">{bookings.length}</p></Panel>
        <Panel><p className="text-sm text-muted">{mode === 'admin' ? 'Verified revenue' : 'Earnings'}</p><p className="text-2xl font-extrabold">{formatPeso(mode === 'admin' ? data.payments.filter((payment) => payment.status === 'verified' && payment.createdAt.slice(0, 10) >= start && payment.createdAt.slice(0, 10) <= end).reduce((sum, payment) => sum + payment.amount, 0) : earnings.total)}</p></Panel>
        <Panel><p className="text-sm text-muted">Utilization</p><p className="text-2xl font-extrabold">{utilization(vehicles, bookings)}%</p></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="h-72">
          <h2 className="font-bold">Booking status</h2>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart><Pie data={counts} dataKey="count" nameKey="status" outerRadius={90}>{counts.map((entry) => <Cell key={entry.status} fill={entry.status === 'completed' ? '#16a34a' : entry.status === 'pending' ? '#f59e0b' : '#2563eb'} />)}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel className="h-72">
          <h2 className="font-bold">Most rented</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={byVehicle.slice(0, 6)}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#ffc400" /></BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  )
}

export function SmsBoard() {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(params.get('new') === '1')
  const [templateId, setTemplateId] = useState('sms-confirm')
  const [body, setBody] = useState('')
  const [phone, setPhone] = useState('0900-000-0004')
  if (!data) return null
  const template = data.smsTemplates.find((item) => item.id === templateId)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h1 className="text-xl font-extrabold">SMS templates</h1>
        <p className="text-sm text-muted">Demo only. Sending records a simulated log and does not contact a phone network.</p>
        <div className="mt-3 space-y-3">
          {data.smsTemplates.map((item) => (
            <label key={item.id} className="block text-sm">
              <span className="font-bold">{item.name}</span>
              <TextArea className="mt-1" defaultValue={item.body} onBlur={(event) => actions.saveTemplate(item.id, event.target.value)} />
            </label>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Activity log</h2>
          <Button onClick={() => { setBody(template?.body ?? ''); setOpen(true) }}>Send test SMS</Button>
        </div>
        {data.smsLogs.map((log) => (
          <article key={log.id} className="border-t py-2 text-sm">
            <StatusBadge value="simulated" /> <span className="font-semibold">{log.to}</span>
            <p className="text-muted">{log.body}</p>
          </article>
        ))}
      </Panel>
      <Modal open={open} onClose={() => setOpen(false)} title="Send test SMS" description="This stays inside the demo log.">
        <div className="space-y-3">
          <SelectInput value={templateId} onChange={(event) => { setTemplateId(event.target.value); setBody(data.smsTemplates.find((item) => item.id === event.target.value)?.body ?? '') }}>
            {data.smsTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectInput>
          <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
          <TextArea value={body} onChange={(event) => setBody(event.target.value)} />
          <Button onClick={async () => { await actions.sendSms({ to: phone, templateId, body: `[Simulated] ${body}` }); setOpen(false) }}>Simulate send</Button>
        </div>
      </Modal>
    </div>
  )
}

export function SettingsBoard() {
  const { data } = useSnapshot()
  const session = useSession()
  const actions = useDemoActions()
  const ask = useUiStore((state) => state.askConfirm)
  const [share, setShare] = useState(String(data?.settings.defaultPartnerShare ?? 70))
  const [commission, setCommission] = useState(String(data?.settings.companyCommissionRate ?? 0))
  if (!data || !session) return null
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h1 className="text-xl font-extrabold">Settings</h1>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={data.settings.holdPendingBookings} onChange={(event) => actions.saveSettings({ holdPendingBookings: event.target.checked })} /> Pending bookings hold the calendar</label>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={data.settings.ownersCanBlockAvailability} onChange={(event) => actions.saveSettings({ ownersCanBlockAvailability: event.target.checked })} /> Owners and partners can block dates</label>
        <label className="mt-3 block text-sm">Default partner share %<TextInput value={share} onChange={(event) => setShare(event.target.value)} /></label>
        <label className="mt-3 block text-sm">Company commission on owner-only cars %<TextInput value={commission} onChange={(event) => setCommission(event.target.value)} /></label>
        <Button className="mt-3" onClick={() => actions.saveSettings({ defaultPartnerShare: Number(share), companyCommissionRate: Number(commission) })}>Save rates</Button>
        <p className="mt-6 text-xs text-muted">Reset clears all bookings, payments, notifications, and SMS logs while keeping demo accounts and vehicles.</p>
        <Button variant="danger" className="mt-3" onClick={() => ask({ title: 'Reset demo data?', message: 'This clears all bookings, payments, favorites, inquiries, SMS logs, and notification history. Demo users and vehicles stay. Your login session is kept.', confirmLabel: 'Reset to walkthrough', tone: 'danger', onConfirm: () => actions.reset() })}>Reset demo data</Button>
        <Button variant="outline" className="mt-3" onClick={() => ask({ title: 'Load full sample history?', message: 'Replaces current data with the populated demo set (~40 bookings) for charts and report walkthroughs. This cannot be undone except by resetting again.', confirmLabel: 'Load sample history', tone: 'primary', onConfirm: () => actions.resetFull() })}>Load full sample history</Button>
      </Panel>
      <Panel>
        <h2 className="font-bold">Inquiries</h2>
        {data.inquiries.map((inquiry) => <article key={inquiry.id} className="border-t py-2 text-sm"><p className="font-semibold">{inquiry.name}</p><p>{inquiry.message}</p></article>)}
      </Panel>
    </div>
  )
}

export function ProfileBoard() {
  const session = useSession()
  const actions = useDemoActions()
  const [phone, setPhone] = useState(session?.phone ?? '')
  const [address, setAddress] = useState(session?.address ?? '')
  if (!session) return null
  return (
    <Panel className="max-w-xl">
      <h1 className="text-xl font-extrabold">Profile & settings</h1>
      <p className="text-sm text-muted">{session.email} · {session.title}</p>
      <p className="mt-2 text-xs text-muted">Demo mode does not store passwords.</p>
      <label className="mt-3 block text-sm">Phone<TextInput value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label className="mt-3 block text-sm">Address<TextInput value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <Button className="mt-3" onClick={() => actions.updateUser(session.id, { phone, address })}>Save profile</Button>
    </Panel>
  )
}

export function StatementsBoard() {
  const { data } = useSnapshot()
  const session = useSession()
  if (!data || !session) return null
  const bookings = scopedBookings(data.bookings, data.vehicles, 'partner', session.id).filter((booking) => ['confirmed', 'ongoing', 'completed'].includes(booking.status))
  const rows = [['Reference', 'Vehicle', 'Pickup', 'Rental', 'Share']]
  bookings.forEach((booking) => {
    const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId)
    rows.push([booking.reference, vehicle?.name ?? '', booking.pickupDate, String(booking.pricing.total), String(shareAmount(booking, vehicle, data.users, data.settings, { role: 'partner', id: session.id }))])
  })
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Statements</h1>
        <Button onClick={() => downloadCsv('drive-moko-partner-statement.csv', rows)}>Download demo statement</Button>
      </div>
      <p className="mb-3 text-sm text-muted">Share rate on this account: {session.shareRate ?? data.settings.defaultPartnerShare}%. The file is generated in the browser.</p>
      {rows.slice(1).map((row) => <p key={row[0]} className="border-t py-2 text-sm">{row[0]} · {row[1]} · rental {formatPeso(Number(row[3]))} · share {formatPeso(Number(row[4]))}</p>)}
    </Panel>
  )
}

export function CustomerFavorites() {
  const { data } = useSnapshot()
  const session = useSession()
  if (!data || !session) return null
  const vehicles = data.vehicles.filter((vehicle) => data.favorites.some((favorite) => favorite.userId === session.id && favorite.vehicleId === vehicle.id))
  return (
    <Panel>
      <h1 className="mb-3 text-xl font-extrabold">Favorites</h1>
      {vehicles.length === 0 ? <p className="text-sm text-muted">No saved vehicles yet.</p> : vehicles.map((vehicle) => <p key={vehicle.id} className="border-t py-2">{vehicle.name} · {formatPeso(vehicle.pricePerDay)} / day</p>)}
    </Panel>
  )
}

export function CustomerNotes() {
  const { data } = useSnapshot()
  const session = useSession()
  if (!data || !session) return null
  const notes = data.notifications.filter((item) => item.userId === session.id)
  return <Panel><h1 className="mb-3 text-xl font-extrabold">Notifications</h1>{notes.map((note) => <article key={note.id} className="border-t py-2 text-sm"><p className="font-bold">{note.title}</p><p>{note.body}</p></article>)}</Panel>
}

function SimpleTable<T>({ columns, data }: { columns: ColumnDef<T>[]; data: T[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), initialState: { pagination: { pageSize: 8 } } })
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted">{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="py-2">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? <tr><td className="py-8 text-center text-muted" colSpan={columns.length}>Nothing to show.</td></tr> : table.getRowModel().rows.map((row) => <tr key={row.id} className="border-t">{row.getVisibleCells().map((cell) => <td key={cell.id} className="py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
        <span className="space-x-2"><button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</button><button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</button></span>
      </div>
    </div>
  )
}
