import { jsPDF } from 'jspdf'
import { BRAND, RENTAL_TERMS } from '@/constants/content'
import type { PriceBreakdown, RentalType } from '@/types'
import { formatPretty, formatTime } from '@/utils/dates'
import { formatPeso } from '@/utils/money'

export type RentalContractData = {
  reference?: string
  vehicleName: string
  vehicleMeta: string
  rentalType: RentalType
  withDriver: boolean
  driverZoneLabel?: string
  pickupLocation: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  renterName: string
  renterEmail: string
  renterPhone: string
  renterAddress: string
  pricing: PriceBreakdown
  specialRequest?: string
  signatureDataUrl: string
  signedAtIso: string
}

let logoCache: string | null = null

async function loadLogoDataUrl() {
  if (logoCache) return logoCache
  const res = await fetch('/logo.jpg')
  if (!res.ok) throw new Error('Could not load Drive Moko logo.')
  const blob = await res.blob()
  logoCache = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read logo.'))
    reader.readAsDataURL(blob)
  })
  return logoCache
}

function rentalTypeLabel(data: RentalContractData) {
  const base = data.rentalType === 'self-drive' ? 'Self-Drive' : 'With Driver'
  if (data.withDriver && data.driverZoneLabel) return `${base} (${data.driverZoneLabel})`
  return base
}

function formatSignedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function ensureSpace(doc: jsPDF, y: number, need: number, margin: number) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + need > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return y
}

function lineBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  pageMargin: number,
) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight, pageMargin)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

export async function buildRentalContractPdf(data: RentalContractData): Promise<Blob> {
  const logo = await loadLogoDataUrl()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2
  let y = margin

  doc.addImage(logo, 'JPEG', margin, y, 22, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(BRAND.name, margin + 26, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(BRAND.company, margin + 26, y + 14)
  doc.text(`${BRAND.place} · ${BRAND.tagline}`, margin + 26, y + 19)
  y += 28

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Vehicle Rental Agreement', margin, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (data.reference) {
    doc.text(`Booking reference: ${data.reference}`, margin, y)
    y += 6
  } else {
    doc.setTextColor(80, 80, 80)
    doc.text('Booking reference will be assigned when you submit this request.', margin, y)
    doc.setTextColor(0, 0, 0)
    y += 6
  }

  y += 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Rental particulars', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const particulars = [
    `Vehicle: ${data.vehicleName} (${data.vehicleMeta})`,
    `Rental type: ${rentalTypeLabel(data)}`,
    `Handover: ${data.pickupLocation}`,
    `Schedule: ${formatPretty(data.pickupDate)} ${formatTime(data.pickupTime)} to ${formatPretty(data.returnDate)} ${formatTime(data.returnTime)} (${data.pricing.days} day${data.pricing.days === 1 ? '' : 's'})`,
    `Rental subtotal: ${formatPeso(data.pricing.base)}`,
    ...(data.withDriver && data.pricing.driver > 0 ? [`Driver package: ${formatPeso(data.pricing.driver)}`] : []),
    `Security deposit (refundable): ${formatPeso(data.pricing.securityDeposit)}`,
    `Total amount: ${formatPeso(data.pricing.total)}`,
  ]
  for (const line of particulars) {
    y = lineBlock(doc, line, margin, y, contentWidth, 5, margin)
  }

  if (data.specialRequest?.trim()) {
    y += 2
    y = lineBlock(doc, `Special request: ${data.specialRequest.trim()}`, margin, y, contentWidth, 5, margin)
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text('Renter', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  for (const line of [
    data.renterName,
    data.renterEmail,
    data.renterPhone,
    data.renterAddress,
  ]) {
    y = lineBlock(doc, line, margin, y, contentWidth, 5, margin)
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text('Terms and conditions', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  for (const term of RENTAL_TERMS) {
    y = lineBlock(doc, `• ${term}`, margin, y, contentWidth, 5, margin)
  }

  y += 6
  y = ensureSpace(doc, y, 45, margin)
  doc.setFont('helvetica', 'bold')
  doc.text('Renter signature', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Printed name: ${data.renterName}`, margin, y)
  y += 5
  doc.text(`Signed: ${formatSignedAt(data.signedAtIso)}`, margin, y)
  y += 4
  doc.addImage(data.signatureDataUrl, 'PNG', margin, y, 70, 28)
  y += 34
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  y = lineBlock(
    doc,
    'By signing, the renter agrees to the terms above and confirms the rental particulars listed in this agreement.',
    margin,
    y,
    contentWidth,
    4.5,
    margin,
  )

  return doc.output('blob')
}

export function downloadContractBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function contractFileName(reference?: string) {
  return reference ? `${reference}-rental-contract.pdf` : 'drive-moko-rental-contract-draft.pdf'
}