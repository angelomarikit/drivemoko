import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRentalContractPdfDocForExport } from '@/utils/rentalContract'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const defaultOut = join(root, 'samples', 'drive-moko-sample-rental-contract.pdf')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sample contract PDF', () => {
  it(
    'writes drive-moko-sample-rental-contract.pdf',
    async () => {
      const out = process.env.SAMPLE_CONTRACT_OUT || defaultOut
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        blob: async () => new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' }),
      } as Response)

      const doc = await createRentalContractPdfDocForExport({
        reference: 'DM-2026-0001',
        vehicleName: 'Hiace Lisette',
        vehicleMeta: 'Van · 15 Seater · Manual',
        vehicleMakeModel: 'NISSAN NV350 PREMIUM',
        vehiclePlate: 'NEA 3580',
        vehicleColor: 'BLACK',
        vehicleFuel: 'Diesel',
        rentalType: 'self-drive',
        withDriver: false,
        pickupLocation: 'Bayombong, Nueva Vizcaya',
        destinationRoute: 'Bayombong, Nueva Vizcaya to Tarlac Vice Versa',
        pickupDate: '2026-11-22',
        returnDate: '2026-11-24',
        pickupTime: '16:00',
        returnTime: '16:00',
        renterName: 'APRIL JOY F. CADIANG',
        renterEmail: 'apriljoy@example.com',
        renterPhone: '09058136696',
        renterAddress: 'SAN NICOLAS NORTH BAYOMBONG, NUEVA VIZCAYA',
        renterLicenseId: 'BO1-18002818',
        pricing: {
          days: 2,
          dailyRate: 4000,
          base: 8000,
          insurance: 0,
          driver: 0,
          childSeat: 0,
          securityDeposit: 3000,
          total: 11000,
        },
        signatureDataUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        signedAtIso: '2026-11-22T08:00:00+08:00',
      })

      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
      expect(statSync(out).size).toBeGreaterThan(2000)
    },
    20_000,
  )
})