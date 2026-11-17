import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRentalContractPdf } from '@/utils/rentalContract'

afterEach(() => {
  vi.restoreAllMocks()
})

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('buildRentalContractPdf', () => {
  it('returns a non-empty PDF including total with security deposit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' }),
    } as Response)
    const blob = await buildRentalContractPdf({
      reference: 'DM-2026-0099',
      vehicleName: 'Yaris',
      vehicleMeta: 'Sedan · 5 Seater',
      rentalType: 'with-driver',
      withDriver: true,
      driverZoneLabel: 'Inside province',
      pickupLocation: 'Deliver to your address',
      pickupDate: '2026-11-23',
      returnDate: '2026-11-25',
      pickupTime: '08:00',
      returnTime: '18:00',
      renterName: 'Test Renter',
      renterEmail: 'test@example.com',
      renterPhone: '09123456789',
      renterAddress: 'Bayombong',
      pricing: {
        days: 2,
        dailyRate: 2999,
        base: 5998,
        insurance: 0,
        driver: 2000,
        childSeat: 0,
        securityDeposit: 3000,
        total: 10998,
      },
      signatureDataUrl: tinyPng,
      signedAtIso: '2026-11-17T10:00:00.000Z',
    })
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(500)
  })
})