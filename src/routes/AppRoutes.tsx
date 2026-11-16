import {
  BarChart3,
  CalendarDays,
  CarFront,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout, type DashLink } from '@/components/layout/DashboardLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { useHydrated, useSession, useSnapshot } from '@/hooks/useDemo'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '@/pages/auth/AuthPages'
import { AdminHome, CustomerHome, OwnerHome, PartnerHome } from '@/pages/dashboards/Homes'
import {
  BookingsBoard,
  CalendarBoard,
  CustomerFavorites,
  CustomerNotes,
  PaymentsBoard,
  PeopleBoard,
  ProfileBoard,
  ReportsBoard,
  SettingsBoard,
  SmsBoard,
  StatementsBoard,
  VehiclesBoard,
} from '@/pages/dashboards/Manage'
import { AboutPage, ContactPage, HowItWorksPage, PartnerPage } from '@/pages/public/InfoPages'
import { BookingPage } from '@/pages/public/BookingPage'
import { CarsPage } from '@/pages/public/CarsPage'
import { HomePage } from '@/pages/public/HomePage'
import { VehicleDetailPage } from '@/pages/public/VehicleDetailPage'
import type { Role } from '@/types'
import { homeForRole } from '@/utils/bookingRules'

function Splash() {
  return <div className="grid min-h-screen place-items-center bg-navy text-white">Loading Drive Moko demo…</div>
}

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const hydrated = useHydrated()
  const session = useSession()
  if (!hydrated) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={homeForRole(session.role)} replace />
  return children
}

export function AppRoutes() {
  const hydrated = useHydrated()
  if (!hydrated) return <Splash />
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="cars" element={<CarsPage />} />
        <Route path="cars/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="book/:vehicleId" element={<BookingPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="become-a-partner" element={<PartnerPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="admin" element={<Guard role="admin"><AdminShell /></Guard>}>
        <Route index element={<AdminHome />} />
        <Route path="bookings" element={<BookingsBoard mode="admin" />} />
        <Route path="vehicles" element={<VehiclesBoard mode="admin" />} />
        <Route path="calendar" element={<CalendarBoard mode="admin" />} />
        <Route path="owners" element={<PeopleBoard kind="owners" />} />
        <Route path="partners" element={<PeopleBoard kind="partners" />} />
        <Route path="customers" element={<PeopleBoard kind="customers" />} />
        <Route path="payments" element={<PaymentsBoard />} />
        <Route path="reports" element={<ReportsBoard mode="admin" />} />
        <Route path="sms" element={<SmsBoard />} />
        <Route path="settings" element={<SettingsBoard />} />
      </Route>
      <Route path="owner" element={<Guard role="owner"><OwnerShell /></Guard>}>
        <Route index element={<OwnerHome />} />
        <Route path="vehicles" element={<VehiclesBoard mode="owner" />} />
        <Route path="bookings" element={<BookingsBoard mode="owner" />} />
        <Route path="calendar" element={<CalendarBoard mode="owner" />} />
        <Route path="earnings" element={<ReportsBoard mode="owner" />} />
        <Route path="reports" element={<ReportsBoard mode="owner" />} />
        <Route path="settings" element={<ProfileBoard />} />
      </Route>
      <Route path="partner" element={<Guard role="partner"><PartnerShell /></Guard>}>
        <Route index element={<PartnerHome />} />
        <Route path="vehicles" element={<VehiclesBoard mode="partner" />} />
        <Route path="reservations" element={<BookingsBoard mode="partner" />} />
        <Route path="calendar" element={<CalendarBoard mode="partner" />} />
        <Route path="earnings" element={<ReportsBoard mode="partner" />} />
        <Route path="statements" element={<StatementsBoard />} />
        <Route path="settings" element={<ProfileBoard />} />
      </Route>
      <Route path="customer" element={<Guard role="customer"><CustomerShell /></Guard>}>
        <Route index element={<CustomerHome />} />
        <Route path="bookings" element={<BookingsBoard mode="customer" />} />
        <Route path="favorites" element={<CustomerFavorites />} />
        <Route path="notifications" element={<CustomerNotes />} />
        <Route path="profile" element={<ProfileBoard />} />
      </Route>
      <Route path="*" element={<div className="grid min-h-screen place-items-center">That page is not in the demo. <a className="ml-2 font-bold" href="/">Go home</a></div>} />
    </Routes>
  )
}

function AdminShell() {
  const { data } = useSnapshot()
  const pending = data?.bookings.filter((booking) => booking.status === 'pending').length ?? 0
  const links: DashLink[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays, badge: pending, children: [{ to: '/admin/bookings?status=pending', label: 'Pending' }, { to: '/admin/bookings', label: 'All bookings' }] },
    { to: '/admin/vehicles', label: 'Vehicles', icon: CarFront, children: [{ to: '/admin/vehicles', label: 'Inventory' }, { to: '/admin/vehicles?new=1', label: 'Add vehicle' }] },
    { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/admin/owners', label: 'Car Owners', icon: Users },
    { to: '/admin/partners', label: 'Links / Partners', icon: Users },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/payments', label: 'Payments', icon: WalletCards },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/sms', label: 'SMS Notifications', icon: MessageSquare },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]
  return <DashboardLayout title="Main Administration Dashboard" subtitle="Manage your car rental operations, bookings, vehicles, and partners." links={links} />
}

function OwnerShell() {
  const session = useSession()
  const links: DashLink[] = [
    { to: '/owner', label: 'My Dashboard', icon: LayoutDashboard, end: true },
    { to: '/owner/vehicles', label: 'My Vehicles', icon: CarFront },
    { to: '/owner/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/owner/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/owner/earnings', label: 'Earnings', icon: WalletCards },
    { to: '/owner/reports', label: 'Reports', icon: BarChart3 },
    { to: '/owner/settings', label: 'Profile & Settings', icon: Settings },
  ]
  return <DashboardLayout title="Car Owner Dashboard" subtitle={`Welcome back, ${session?.name.split(' ')[0] ?? 'there'}! Manage your vehicles, bookings, and earnings.`} links={links} />
}

function PartnerShell() {
  const session = useSession()
  const links: DashLink[] = [
    { to: '/partner', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/partner/vehicles', label: 'My Vehicles', icon: CarFront },
    { to: '/partner/reservations', label: 'Reservations', icon: CalendarDays },
    { to: '/partner/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/partner/earnings', label: 'Earnings', icon: WalletCards },
    { to: '/partner/statements', label: 'Statements', icon: BarChart3 },
    { to: '/partner/settings', label: 'Profile & Settings', icon: Settings },
  ]
  return <DashboardLayout title="Links / Partner Dashboard" subtitle={`Welcome back, ${session?.name.split(' ')[0] ?? 'there'}! Manage your listed vehicles, bookings, and partner earnings.`} links={links} />
}

function CustomerShell() {
  const session = useSession()
  const links: DashLink[] = [
    { to: '/customer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/cars', label: 'Browse Cars', icon: CarFront },
    { to: '/customer/bookings', label: 'My Bookings', icon: CalendarDays },
    { to: '/customer/favorites', label: 'Favorites', icon: Heart },
    { to: '/customer/notifications', label: 'Notifications', icon: MessageSquare },
    { to: '/customer/profile', label: 'Profile & Settings', icon: Settings },
  ]
  return <DashboardLayout title="Customer Dashboard" subtitle={`Welcome back, ${session?.name.split(' ')[0] ?? 'there'}! Track your rentals and saved cars.`} links={links} />
}
