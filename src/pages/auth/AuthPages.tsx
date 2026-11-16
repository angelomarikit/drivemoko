import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { BrandLockup } from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/Button'
import { ErrorText, FieldLabel, TextInput } from '@/components/ui/Fields'
import { DEMO_ACCOUNTS } from '@/constants/content'
import { useDemoActions } from '@/hooks/useDemo'
import { homeForRole } from '@/utils/bookingRules'
import { toast } from 'sonner'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(4),
  password: z.string().min(6, 'Use at least 6 characters. It is not stored.'),
  confirm: z.string(),
}).refine((value) => value.password === value.confirm, { message: 'Passwords do not match', path: ['confirm'] })

export function LoginPage() {
  const actions = useDemoActions()
  const navigate = useNavigate()
  return (
    <AuthShell>
      <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Demo mode — not production security</p>
      <h1 className="mt-3 text-3xl font-extrabold">Choose a demo desk</h1>
      <p className="mt-2 text-sm text-muted">No password is checked. Pick a role to open its dashboard. These inboxes are fictional.</p>
      <div className="mt-5 space-y-3">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.id}
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left hover:border-gold"
            onClick={async () => {
              await actions.login(account.id)
              const role = account.id === 'user-admin' ? 'admin' : account.id === 'user-owner' ? 'owner' : account.id === 'user-partner' ? 'partner' : 'customer'
              navigate(homeForRole(role))
            }}
          >
            <span>
              <span className="block font-bold">{account.role}</span>
              <span className="text-sm text-muted">{account.email}</span>
            </span>
            <span className="text-xs font-semibold text-muted">{account.blurb}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm">New customer? <Link to="/register" className="font-bold">Create a demo profile</Link></p>
      <p className="text-sm"><Link to="/forgot-password" className="font-bold">Forgot password</Link></p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const actions = useDemoActions()
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })
  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Create a customer profile</h1>
      <p className="mt-2 text-sm text-muted">The password is checked only on this form and is not saved.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          const user = await actions.registerCustomer({ role: 'customer', name: values.name, email: values.email, phone: values.phone, address: values.address })
          if (!user) return
          await actions.login(user.id)
          navigate('/customer')
        })}
      >
        <label><FieldLabel required>Full name</FieldLabel><TextInput {...form.register('name')} /></label>
        <label><FieldLabel required>Email</FieldLabel><TextInput {...form.register('email')} /></label>
        <label><FieldLabel required>Phone</FieldLabel><TextInput {...form.register('phone')} /></label>
        <label><FieldLabel required>Address</FieldLabel><TextInput {...form.register('address')} /></label>
        <label><FieldLabel required>Password</FieldLabel><TextInput type="password" {...form.register('password')} /></label>
        <label><FieldLabel required>Confirm password</FieldLabel><TextInput type="password" {...form.register('confirm')} /></label>
        {Object.values(form.formState.errors).map((error) => <ErrorText key={error?.message}>{error?.message}</ErrorText>)}
        <Button type="submit" className="w-full">Create demo customer</Button>
      </form>
      <p className="mt-3 text-sm"><Link to="/login" className="font-bold">Back to demo login</Link></p>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const form = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email() })) })
  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Reset access</h1>
      <p className="mt-2 text-sm text-muted">Demo mode does not send email. Use the account switcher on the login page.</p>
      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(() => toast.message('No email was sent. Open the demo login and pick a role.'))}>
        <label><FieldLabel required>Email</FieldLabel><TextInput {...form.register('email')} /></label>
        <ErrorText>{form.formState.errors.email?.message}</ErrorText>
        <Button type="submit">Show demo reminder</Button>
      </form>
      <Link to="/login" className="mt-4 inline-block text-sm font-bold">Return to login</Link>
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy text-white lg:block">
        <img src="/vehicles/mountains.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandLockup />
          <div>
            <p className="text-4xl font-black italic">Susi Mo Sa <span className="text-gold">Masayang Biyahe!</span></p>
            <p className="mt-3 max-w-sm text-white/80">A demonstration of the Drive Moko rental desk. Switch roles anytime from the dashboard menu.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
