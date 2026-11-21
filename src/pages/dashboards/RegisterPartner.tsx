import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, KeyRound, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { friendlyErrorMessage } from '@/utils/friendlyError'
import { z } from 'zod'
import { Panel } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { DateField, ErrorText, FieldLabel, SelectInput, TextArea, TextInput } from '@/components/ui/Fields'
import { isMockProvider, isSupabaseProvider } from '@/lib/config'
import { useDemoActions } from '@/hooks/useDemo'
import {
  buildPartnerEmail,
  generatePartnerPassword,
  registerPartnerAccount,
  suggestEmailLocal,
  PARTNER_EMAIL_DOMAIN,
} from '@/services/supabase/partnerProvisioning'
import { manilaYmd } from '@/utils/dates'

const schema = z.object({
  emailLocal: z
    .string()
    .min(2, 'Enter an email username.')
    .regex(/^[a-z0-9.-]+$/i, 'Use letters, numbers, dots, or hyphens only.'),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
  fullName: z.string().min(2),
  contactPerson: z.string().min(2),
  phone: z.string().min(10),
  address: z.string().min(4),
  businessName: z.string().min(2),
  vehicleCount: z.coerce.number().min(0),
  ownershipType: z.enum(['owned', 'financed', 'fleet']),
  vehicleSummary: z.string().min(4, 'Describe the vehicles or units covered.'),
  contractReference: z.string().min(2, 'Contract or agreement reference is required.'),
  contractSignedAt: z.string().min(1),
  contractNotes: z.string(),
  profileNotes: z.string(),
})

type FormValues = z.infer<typeof schema>

export function RegisterPartnerPage() {
  const actions = useDemoActions()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      emailLocal: '',
      password: generatePartnerPassword(),
      vehicleCount: 1,
      ownershipType: 'owned',
      contractSignedAt: manilaYmd(),
      contractNotes: '',
      profileNotes: '',
      vehicleSummary: '',
      contractReference: '',
    },
  })

  const emailLocal = form.watch('emailLocal')
  const previewEmail = emailLocal ? buildPartnerEmail(emailLocal) : `username@${PARTNER_EMAIL_DOMAIN}`

  const copyCredentials = async () => {
    if (!result) return
    const text = `Drive Moko partner login\nEmail: ${result.email}\nPassword: ${result.password}\nSign in: ${window.location.origin}/login`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Credentials copied.')
    } catch {
      toast.message(text)
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">Register partner account</h1>
            <p className="mt-1 text-sm text-muted">
              Creates a Links / Partner login, contract details, and partner profile. Partner emails use{' '}
              <strong>@{PARTNER_EMAIL_DOMAIN}</strong> by default.
            </p>
          </div>
          <Link to="/admin/partners" className="text-sm font-bold text-info">
            Back to partners
          </Link>
        </div>
        {isSupabaseProvider() ? (
          <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 text-xs text-muted">
            Requires SQL migration <code className="text-[11px]">022_partner_registration.sql</code>. Partner creation
            uses the <code className="text-[11px]">create-partner-account</code> Edge Function when deployed; otherwise
            the app creates the auth user via sign-up and finalizes the partner profile as admin.
          </p>
        ) : null}
      </Panel>

      {result ? (
        <Panel className="border-success/30 bg-emerald-50/40">
          <h2 className="font-bold text-success">Partner account created</h2>
          <p className="mt-2 text-sm">
            <strong>Email:</strong> {result.email}
            <br />
            <strong>Password:</strong> {result.password}
          </p>
          <p className="mt-2 text-xs text-muted">Share these credentials securely with the partner. They can change their password after sign-in.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void copyCredentials()}>
              <Copy className="h-4 w-4" /> Copy login details
            </Button>
            <Button
              type="button"
              onClick={() => {
                setResult(null)
                form.reset({
                  ...form.getValues(),
                  password: generatePartnerPassword(),
                  emailLocal: '',
                })
              }}
            >
              Register another
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              setBusy(true)
              try {
                const email = buildPartnerEmail(values.emailLocal)
                if (isMockProvider()) {
                  const notes = [
                    `Business: ${values.businessName}`,
                    `Contract: ${values.contractReference} (${values.contractSignedAt})`,
                    `Units: ${values.vehicleCount} · ${values.ownershipType}`,
                    values.vehicleSummary,
                    values.contractNotes,
                  ]
                    .filter(Boolean)
                    .join('\n')
                  await actions.createUser({
                    role: 'partner',
                    name: values.fullName,
                    email,
                    phone: values.phone,
                    address: values.address,
                    notes: notes + (values.profileNotes ? `\n${values.profileNotes}` : ''),
                  })
                  setResult({ email, password: values.password })
                  toast.success('Demo partner account added.')
                  return
                }
                const { email: createdEmail } = await registerPartnerAccount({
                  emailLocal: values.emailLocal,
                  password: values.password,
                  fullName: values.fullName,
                  contactPerson: values.contactPerson,
                  phone: values.phone,
                  address: values.address,
                  businessName: values.businessName,
                  shareRatePercent: 0,
                  vehicleCount: values.vehicleCount,
                  ownershipType: values.ownershipType,
                  vehicleSummary: values.vehicleSummary,
                  contractReference: values.contractReference,
                  contractNotes: values.contractNotes,
                  contractSignedAt: values.contractSignedAt,
                  profileNotes: [
                    values.profileNotes,
                    `Contact: ${values.contactPerson}`,
                  ]
                    .filter(Boolean)
                    .join('\n'),
                })
                setResult({ email: createdEmail, password: values.password })
                toast.success('Partner account provisioned.')
              } catch (error) {
                toast.error(friendlyErrorMessage(error, 'account'))
              } finally {
                setBusy(false)
              }
            })}
          >
            <Section title="Login credentials" />
            <label className="md:col-span-2">
              <FieldLabel required>Email username</FieldLabel>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <TextInput
                  className="max-w-xs"
                  placeholder="nehemiah.links"
                  {...form.register('emailLocal')}
                  onChange={(event) => form.setValue('emailLocal', event.target.value.toLowerCase(), { shouldValidate: true })}
                />
                <span className="text-sm font-semibold text-muted">@{PARTNER_EMAIL_DOMAIN}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Will become: {previewEmail}</p>
            </label>
            <label>
              <FieldLabel required>Generated password</FieldLabel>
              <div className="flex gap-2">
                <TextInput type="text" autoComplete="new-password" {...form.register('password')} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.setValue('password', generatePartnerPassword())}
                  title="Generate password"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>
            </label>

            <Section title="Partner identity" />
            <label>
              <FieldLabel required>Legal / display name</FieldLabel>
              <TextInput
                {...form.register('fullName', {
                  onBlur: () => {
                    if (!form.getValues('emailLocal') && form.getValues('fullName')) {
                      form.setValue('emailLocal', suggestEmailLocal(form.getValues('fullName')))
                    }
                  },
                })}
              />
            </label>
            <label>
              <FieldLabel required>Primary contact person</FieldLabel>
              <TextInput {...form.register('contactPerson')} />
            </label>
            <label>
              <FieldLabel required>Phone</FieldLabel>
              <TextInput {...form.register('phone')} />
            </label>
            <label>
              <FieldLabel required>Address</FieldLabel>
              <TextInput {...form.register('address')} />
            </label>
            <label className="md:col-span-2">
              <FieldLabel required>Business / link name</FieldLabel>
              <TextInput {...form.register('businessName')} placeholder="Nehemiah Sales and Services Corp." />
            </label>

            <Section title="Agreement & fleet" />
            <p className="md:col-span-2 text-xs text-muted">
              Partner earnings use fixed per-day amounts set under Admin → Partners → Profile (not a percentage).
            </p>
            <label>
              <FieldLabel required>Number of vehicles (units)</FieldLabel>
              <TextInput type="number" {...form.register('vehicleCount')} />
            </label>
            <label>
              <FieldLabel required>Ownership type</FieldLabel>
              <SelectInput {...form.register('ownershipType')}>
                <option value="owned">Owned</option>
                <option value="financed">Financed</option>
                <option value="fleet">Fleet / multiple units</option>
              </SelectInput>
            </label>
            <label>
              <FieldLabel required>Contract reference</FieldLabel>
              <TextInput {...form.register('contractReference')} placeholder="DM-PARTNER-2026-001" />
            </label>
            <DateField
              label="Contract signed"
              value={form.watch('contractSignedAt')}
              onChange={(value) => form.setValue('contractSignedAt', value)}
            />
            <label className="md:col-span-2">
              <FieldLabel required>Vehicle units (summary)</FieldLabel>
              <TextArea
                placeholder="e.g. 2× SUV, 1× sedan — plate numbers or models covered by this agreement"
                {...form.register('vehicleSummary')}
              />
            </label>
            <label className="md:col-span-2">
              <FieldLabel>Contract notes</FieldLabel>
              <TextArea {...form.register('contractNotes')} placeholder="Revenue share terms, exclusivity, renewal date, etc." />
            </label>
            <label className="md:col-span-2">
              <FieldLabel>Internal admin notes</FieldLabel>
              <TextArea {...form.register('profileNotes')} />
            </label>

            {Object.entries(form.formState.errors).map(([field, error]) =>
              error?.message ? (
                <div key={field} className="md:col-span-2">
                  <ErrorText>{error.message}</ErrorText>
                </div>
              ) : null,
            )}

            <Button type="submit" className="md:col-span-2" disabled={busy}>
              <UserPlus className="h-4 w-4" />
              {busy ? 'Creating account…' : 'Create partner account'}
            </Button>
          </form>
        </Panel>
      )}
    </div>
  )
}

function Section({ title }: { title: string }) {
  return <h2 className="md:col-span-2 border-b border-line pb-1 text-sm font-extrabold text-navy">{title}</h2>
}