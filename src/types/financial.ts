export type EarningStatus = 'pending' | 'payable' | 'in_settlement' | 'settled' | 'void'
export type SettlementStatus = 'draft' | 'paid' | 'void'

export interface PartnerEarning {
  id: string
  bookingId: string
  partnerId: string
  vehicleId: string
  grossCentavos: number
  shareRateBps: number
  partnerShareCentavos: number
  companyShareCentavos: number
  status: EarningStatus
  recognizedAt?: string
  createdAt: string
  bookingReference?: string
  vehicleName?: string
}

export interface PartnerSettlement {
  id: string
  partnerId: string
  periodStart: string
  periodEnd: string
  totalPartnerCentavos: number
  status: SettlementStatus
  payoutReference: string
  paidAt?: string
  notes: string
  createdAt: string
  partnerName?: string
}