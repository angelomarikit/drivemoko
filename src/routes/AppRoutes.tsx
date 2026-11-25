import {
  BarChart3,
  CalendarDays,
  CarFront,
  Tags,
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
import { useAppReady, useSession, useSnapshot } from '@/hooks/useDemo'
import { isSupabaseProvider } from '@/lib/config'
import {
  AuthCallbackPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailNoticePage,
} from '@/pages/auth/AuthPages'
import { AdminHome, CustomerHome, PartnerHome } from '@/pages/dashboards/Homes'
import {
  BookingsBoard,
  CalendarBoard,
  CustomerFavorites,
  CustomerNotes,
  PaymentsBoard,
  PeopleBoard,
  ProfileBoard,
  RentalPackagesBoard,
  ReportsBoard,
  SettlementsBoard,
  SettingsBoard,
  SmsBoard,
  StatementsBoard,
  VehiclesBoard,
} from '@/pages/dashboards/Manage'
import { PartnersBoard } from '@/pages/dashboards/PartnersBoard'
import { RegisterPartnerPage } from '@/pages/dashboards/RegisterPartner'
import { AboutPage, ContactPage, HowItWorksPage, PartnerPage } from '@/pages/public/InfoPages'
import { BookingPage } from '@/pages/public/BookingPage'
import { CarsPage } from '@/pages/public/CarsPage'
import { HomePage } from '@/pages/public/HomePage'
import { VehicleDetailPage } from '@/pages/public/VehicleDetailPage'
import type { Role } from '@/types'
import { homeForRole } from '@/utils/bookingRules'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-navy text-white">Loading Drive Moko…</div>
  )
}

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const ready = useAppReady()
  const session = useSession()
  if (!ready) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (session.status === 'suspended') return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={homeForRole(session.role)} replace />
  return children
}

/** Links / Partner area — legacy `owner` profiles are routed here after login. */
function PartnerGuard({ children }: { children: ReactNode }) {
  const ready = useAppReady()
  const session = useSession()
  if (!ready) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (session.status === 'suspended') return <Navigate to="/login" replace />
  if (session.role !== 'partner' && session.role !== 'owner') {
    return <Navigate to={homeForRole(session.role)} replace />
  }
  return children
}

export function AppRoutes() {
  const ready = useAppReady()
  if (!ready) return <Splash />
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
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      <Route path="auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="auth/verify" element={<VerifyEmailNoticePage />} />
      <Route path="admin" element={<Guard role="admin"><AdminShell /></Guard>}>
        <Route index element={<AdminHome />} />
        <Route path="bookings" element={<BookingsBoard mode="admin" />} />
        <Route path="vehicles" element={<VehiclesBoard mode="admin" />} />
        <Route path="calendar" element={<CalendarBoard mode="admin" />} />
        <Route path="partners" element={<PartnersBoard />} />
        <Route path="partners/register" element={<RegisterPartnerPage />} />
        <Route path="customers" element={<PeopleBoard />} />
        <Route path="payments" element={<PaymentsBoard />} />
        <Route path="reports" element={<ReportsBoard mode="admin" />} />
        <Route path="settlements" element={<SettlementsBoard />} />
        <Route path="sms" element={<SmsBoard />} />
        <Route path="rental-packages" element={<RentalPackagesBoard />} />
        <Route path="settings" element={<SettingsBoard />} />
      </Route>
      <Route path="owner/*" element={<Navigate to="/partner" replace />} />
      <Route path="admin/owners/*" element={<Navigate to="/admin/partners" replace />} />
      <Route path="partner" element={<PartnerGuard><PartnerShell /></PartnerGuard>}>
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
      <Route path="*" element={<div className="grid min-h-screen place-items-center">Page not found. <a className="ml-2 font-bold" href="/">Go home</a></div>} />
    </Routes>
  )
}

function AdminShell() {
  const { data } = useSnapshot()
  const pending = data?.bookings.filter((booking) => booking.status === 'pending').length ?? 0
  const pendingPartnerApps =
    data?.applications.filter((item) => item.status === 'pending' || item.status === 'needs_info').length ?? 0
  const links: DashLink[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays, badge: pending },
    { to: '/admin/vehicles', label: 'Vehicles', icon: CarFront },
    { to: '/admin/rental-packages', label: 'Rental packages', icon: Tags },
    { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
    {
      to: '/admin/partners',
      label: 'Links / Partners',
      icon: Users,
      badge: pendingPartnerApps > 0 ? pendingPartnerApps : undefined,
      children: [
        { to: '/admin/partners/register', label: 'Register partner account' },
      ],
    },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/payments', label: 'Payments', icon: WalletCards },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/settlements', label: 'Settlements', icon: WalletCards },
    { to: '/admin/sms', label: 'SMS Notifications', icon: MessageSquare },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]
  return <DashboardLayout title="Main Administration Dashboard" subtitle="Manage your car rental operations, bookings, vehicles, and partners." links={links} />
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
