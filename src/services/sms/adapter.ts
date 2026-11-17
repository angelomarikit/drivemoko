export type SmsProviderStatus = 'not_configured' | 'configured' | 'error'

export interface SmsSendInput {
  to: string
  body: string
  templateKey?: string
  bookingId?: string
}

export interface SmsSendResult {
  status: 'skipped' | 'queued' | 'failed'
  provider: string
  message?: string
}

/**
 * SMS adapter — production sends must run in Supabase Edge Functions with provider secrets.
 * No VITE_* provider tokens.
 */
export function getSmsProviderStatus(): SmsProviderStatus {
  if (import.meta.env.VITE_SMS_STATUS === 'configured') return 'configured'
  return 'not_configured'
}

export async function sendSms(_input: SmsSendInput): Promise<SmsSendResult> {
  const status = getSmsProviderStatus()
  if (status !== 'configured') {
    return {
      status: 'skipped',
      provider: 'not_configured',
      message: 'SMS provider is not configured. Use in-app notifications.',
    }
  }
  return {
    status: 'failed',
    provider: 'edge_function',
    message: 'SMS edge function not deployed in this environment.',
  }
}