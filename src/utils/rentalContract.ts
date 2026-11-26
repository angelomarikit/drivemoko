import { jsPDF } from 'jspdf'
import { RENTAL_AGREEMENT_CLAUSES, RENTAL_AGREEMENT_COMPANY } from '@/constants/content'
import type { PriceBreakdown, RentalType } from '@/types'
import { formatPretty, formatTime } from '@/utils/dates'

function formatPesoPdf(amount: number) {
  const n = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(amount)
  return `PHP ${n}`
}

function pdfSafeText(text: string) {
  return text.replace(/\u2014/g, '-').replace(/₱/g, 'PHP ')
}

export type RentalContractData = {
  reference?: string
  vehicleName: string
  vehicleMeta: string
  vehicleMakeModel?: string
  vehiclePlate?: string
  vehicleColor?: string
  vehicleFuel?: string
  rentalType: RentalType
  withDriver: boolean
  driverZoneLabel?: string
  pickupLocation: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  destinationRoute?: string
  renterName: string
  renterEmail: string
  renterPhone: string
  renterAddress: string
  renterLicenseId?: string
  pricing: PriceBreakdown
  specialRequest?: string
  signatureDataUrl: string
  signedAtIso: string
}

let logoCache: string | null = null

function canFlattenSignatureInDom(): boolean {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return false
  if (import.meta.env.MODE === 'test') return false
  return true
}

/** Flatten signature onto white JPEG so jsPDF does not paint transparency magenta. */
async function prepareSignatureForPdf(
  dataUrl: string,
): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> {
  if (!dataUrl?.startsWith('data:image/')) return null
  if (!canFlattenSignatureInDom()) return null

  return new Promise((resolve) => {
    const fail = () => resolve(null)
    const timer = window.setTimeout(fail, 3000)
    const img = new Image()
    img.onload = () => {
      window.clearTimeout(timer)
      const w = Math.max(img.naturalWidth, 2)
      const h = Math.max(img.naturalHeight, 2)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        fail()
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0)
      resolve({ data: canvas.toDataURL('image/jpeg', 0.92), format: 'JPEG' })
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      fail()
    }
    img.src = dataUrl
  })
}

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

function agreementTitle(data: RentalContractData) {
  if (data.rentalType === 'with-driver' || data.withDriver) {
    return 'CAR RENTAL AGREEMENT (WITH DRIVER)'
  }
  return 'SELF-DRIVE CAR RENTAL AGREEMENT'
}

function scheduleAt(dateYmd: string, time: string) {
  return `${formatPretty(dateYmd)} @ ${formatTime(time)}`
}

function formatAgreementDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }).format(new Date(iso))
  } catch {
    return formatPretty(iso.slice(0, 10))
  }
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

function otherChargesTotal(pricing: PriceBreakdown) {
  return pricing.insurance + pricing.driver + pricing.childSeat
}

function destinationRoute(data: RentalContractData) {
  if (data.destinationRoute?.trim()) return data.destinationRoute.trim()
  if (data.specialRequest?.trim()) return data.specialRequest.trim()
  return data.pickupLocation
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
  const lines = doc.splitTextToSize(pdfSafeText(text), maxWidth) as string[]
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight, pageMargin)
    doc.text(line, x, y, { baseline: 'top', maxWidth })
    y += lineHeight
  }
  return y
}

function drawFooter(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text(`${RENTAL_AGREEMENT_COMPANY.legalName} | ${title}`, pageWidth / 2, pageHeight - 8, {
    align: 'center',
  })
  doc.setTextColor(0, 0, 0)
}

const FIELD_LABEL_GAP = 3
const FIELD_VALUE_LINE = 3.4
const FIELD_UNDERLINE_GAP = 1
const FIELD_ROW_GAP = 2

function drawLabeledField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  const display = pdfSafeText(value || '-')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(label, x, y, { baseline: 'top' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const lines = (doc.splitTextToSize(display, width) as string[]).slice(0, 2)
  let cy = y + FIELD_LABEL_GAP
  for (const line of lines) {
    doc.text(line, x, cy, { baseline: 'top', maxWidth: width })
    cy += FIELD_VALUE_LINE
  }
  cy += FIELD_UNDERLINE_GAP
  doc.setLineWidth(0.15)
  doc.setDrawColor(130, 130, 130)
  doc.line(x, cy, x + width, cy)
  doc.setDrawColor(0, 0, 0)
  return cy + FIELD_ROW_GAP
}

function drawFieldPair(
  doc: jsPDF,
  left: { label: string; value: string },
  right: { label: string; value: string },
  y: number,
  leftX: number,
  rightX: number,
  colW: number,
) {
  const a = drawLabeledField(doc, left.label, left.value, leftX, y, colW)
  const b = drawLabeledField(doc, right.label, right.value, rightX, y, colW)
  return Math.max(a, b)
}

function drawContractHeader(doc: jsPDF, logo: string, title: string, margin: number, pageWidth: number) {
  const logoSize = 22
  const rightLogoX = pageWidth - margin - logoSize
  const textW = rightLogoX - margin - 8
  let y = margin

  doc.addImage(logo, 'JPEG', rightLogoX, y, logoSize, logoSize)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const nameLines = (doc.splitTextToSize(RENTAL_AGREEMENT_COMPANY.legalName, textW) as string[]).slice(0, 2)
  let ty = y + 2
  for (const line of nameLines) {
    doc.text(line, margin, ty, { baseline: 'top', maxWidth: textW })
    ty += 3.8
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(RENTAL_AGREEMENT_COMPANY.tradeName, margin, ty, { baseline: 'top' })
  ty += 3.2
  doc.text(RENTAL_AGREEMENT_COMPANY.address, margin, ty, { baseline: 'top', maxWidth: textW })
  ty += 3.2
  doc.text(`Contact: ${RENTAL_AGREEMENT_COMPANY.contact}`, margin, ty, { baseline: 'top' })

  y = Math.max(y + logoSize, ty + 2) + 3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  for (const line of doc.splitTextToSize(title, pageWidth - margin * 2) as string[]) {
    doc.text(line, pageWidth / 2, y, { align: 'center', baseline: 'top' })
    y += 4.2
  }
  doc.setLineWidth(0.3)
  doc.line(margin, y + 1, pageWidth - margin, y + 1)
  return y + 5
}

function resolveVehicleFields(data: RentalContractData) {
  const blank = '______________________________'
  return {
    makeModel: data.vehicleMakeModel?.trim() || data.vehicleName,
    plate: data.vehiclePlate?.trim() || 'As listed at pickup',
    color: data.vehicleColor?.trim() || '-',
    fuel: data.vehicleFuel?.trim() || '-',
    renterLicense: data.renterLicenseId?.trim() || 'On file at pickup',
    companyLicense: RENTAL_AGREEMENT_COMPANY.authorizedRepLicenseId.trim() || blank,
    ownerRep: RENTAL_AGREEMENT_COMPANY.authorizedRepresentative.trim() || blank,
  }
}

async function createRentalContractPdfDoc(data: RentalContractData): Promise<jsPDF> {
  const logo = await loadLogoDataUrl()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2
  const colGap = 6
  const colW = (contentWidth - colGap) / 2
  const leftColX = margin
  const rightColX = margin + colW + colGap
  const termsWidth = contentWidth - 5
  const termsX = margin + 4
  const title = agreementTitle(data)
  const vehicle = resolveVehicleFields(data)
  const agreementDate = formatAgreementDate(data.signedAtIso)
  const otherCharges = otherChargesTotal(data.pricing)

  let y = drawContractHeader(doc, logo, title, margin, pageWidth)

  if (data.reference) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Booking reference: ${data.reference}`, margin, y, { baseline: 'top' })
    y += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('OWNER / RENTAL COMPANY', leftColX, y, { baseline: 'top' })
  doc.text('RENTER', rightColX, y, { baseline: 'top' })
  y += 4

  y = drawFieldPair(
    doc,
    { label: 'Business Name:', value: RENTAL_AGREEMENT_COMPANY.legalName },
    { label: 'Full Name:', value: data.renterName },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y = drawFieldPair(
    doc,
    { label: 'Address:', value: RENTAL_AGREEMENT_COMPANY.address },
    { label: 'Complete Address:', value: data.renterAddress },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y = drawFieldPair(
    doc,
    { label: 'Contact No.:', value: RENTAL_AGREEMENT_COMPANY.contact },
    { label: 'Contact Number:', value: data.renterPhone },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y = drawFieldPair(
    doc,
    { label: "Valid ID / Driver's License:", value: vehicle.companyLicense },
    { label: "Valid ID / Driver's License No.:", value: vehicle.renterLicense },
    y,
    leftColX,
    rightColX,
    colW,
  )

  doc.setFont('helvetica', 'bold')
  doc.text('VEHICLE', margin, y, { baseline: 'top' })
  y += 4
  y = drawFieldPair(
    doc,
    { label: 'Make & Model:', value: vehicle.makeModel },
    { label: 'Plate / Registration No.:', value: vehicle.plate },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y = drawFieldPair(
    doc,
    { label: 'Color:', value: vehicle.color },
    { label: 'Fuel Type:', value: vehicle.fuel.toUpperCase() },
    y,
    leftColX,
    rightColX,
    colW,
  )

  doc.setFont('helvetica', 'bold')
  doc.text('2. RENTAL PERIOD', margin, y, { baseline: 'top' })
  y += 4
  y = drawFieldPair(
    doc,
    { label: 'Start Date & Time:', value: scheduleAt(data.pickupDate, data.pickupTime) },
    { label: 'End Date & Time:', value: scheduleAt(data.returnDate, data.returnTime) },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y = drawLabeledField(doc, 'Destination / Route:', destinationRoute(data), margin, y, contentWidth)

  y = drawFieldPair(
    doc,
    { label: 'Daily Rental Rate:', value: formatPesoPdf(data.pricing.dailyRate) },
    { label: 'Number of Days:', value: String(data.pricing.days) },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y = drawFieldPair(
    doc,
    { label: 'Security Deposit:', value: formatPesoPdf(data.pricing.securityDeposit) },
    { label: 'Other Charges (if any):', value: formatPesoPdf(otherCharges > 0 ? otherCharges : 0) },
    y,
    leftColX,
    rightColX,
    colW,
  )
  y += 1

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  y = lineBlock(
    doc,
    `This Agreement is made on ${agreementDate} between the Owner / Rental Company and the Renter identified above.`,
    margin,
    y,
    contentWidth,
    3.5,
    margin,
  )
  y = lineBlock(
    doc,
    `${RENTAL_AGREEMENT_COMPANY.legalName} (Owner / Authorized Representative: ${vehicle.ownerRep})`,
    margin,
    y,
    contentWidth,
    3.5,
    margin,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  y += 1
  doc.text('Terms and conditions', margin, y, { baseline: 'top' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  for (const clause of RENTAL_AGREEMENT_CLAUSES.slice(0, 10)) {
    y = lineBlock(doc, `- ${clause}`, termsX, y, termsWidth, 3.3, margin)
  }
  drawFooter(doc, title)

  doc.addPage()
  y = margin
  for (const clause of RENTAL_AGREEMENT_CLAUSES.slice(10)) {
    y = lineBlock(doc, `- ${clause}`, termsX, y, termsWidth, 3.3, margin)
  }
  y += 2
  y = lineBlock(
    doc,
    'By signing below, both parties acknowledge that they have read, understood, and agreed to all the terms and conditions of this Agreement.',
    margin,
    y,
    contentWidth,
    3.5,
    margin,
  )

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SIGNATURES', margin, y, { baseline: 'top' })
  y += 6
  doc.setFontSize(8)
  doc.text(`FOR ${RENTAL_AGREEMENT_COMPANY.legalName}`, leftColX, y, { baseline: 'top', maxWidth: colW })
  doc.text('RENTER', rightColX, y, { baseline: 'top' })
  y += 10
  doc.setLineWidth(0.25)
  doc.line(leftColX, y, leftColX + colW - 2, y)
  doc.line(rightColX, y, pageWidth - margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(vehicle.ownerRep, leftColX, y, { baseline: 'top', maxWidth: colW })
  doc.text(data.renterName, rightColX, y, { baseline: 'top', maxWidth: colW })
  y += 4
  doc.setFontSize(7)
  doc.text('Owner / Authorized Representative', leftColX, y, { baseline: 'top' })
  y += 6

  const signature = await prepareSignatureForPdf(data.signatureDataUrl)
  if (signature) {
    doc.addImage(signature.data, signature.format, rightColX, y, 52, 20)
    y += 22
    doc.text(`Signed ${formatSignedAt(data.signedAtIso)}`, rightColX, y, { baseline: 'top' })
    y += 5
  } else {
    doc.text(`Signed ${formatSignedAt(data.signedAtIso)}`, rightColX, y, { baseline: 'top' })
    y += 5
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('NOTARIZATION (if applicable)', margin, y, { baseline: 'top' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  for (const line of [
    'PTR No.: ____________________   IBP No.: ____________________',
    `Doc No. __________ Page No. _________ Book No. _________ Series of ${new Date().getFullYear()}`,
    'NOTARY PUBLIC',
    'Serial No. of Commission: __________________________',
    'Notary Public for ____________ until ____________',
    'Roll of Attorneys No.: _____________________________',
    'SUBSCRIBED AND SWORN to before me this ______ day of ____________ at Bayombong, Nueva Vizcaya, Philippines.',
    'Witness my hand and seal this _______ day of ______________.',
  ]) {
    y = lineBlock(doc, line, margin, y, contentWidth, 3.5, margin)
  }
  drawFooter(doc, title)
  return doc
}

export async function buildRentalContractPdf(data: RentalContractData): Promise<Blob> {
  const doc = await createRentalContractPdfDoc(data)
  return doc.output('blob')
}

export async function createRentalContractPdfDocForExport(data: RentalContractData): Promise<jsPDF> {
  return createRentalContractPdfDoc(data)
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
  return reference ? `${reference}-rental-contract.pdf` : 'drive-moko-sample-rental-contract.pdf'
}

export function vehicleColorFromName(name: string): string {
  const lower = name.toLowerCase()
  for (const c of ['black', 'white', 'red', 'blue', 'silver', 'gray', 'grey', 'pink', 'green']) {
    if (lower.includes(c)) return c.charAt(0).toUpperCase() + c.slice(1)
  }
  return '-'
}

export function buildDestinationRoute(pickupLocation: string, specialRequest?: string) {
  const route = specialRequest?.trim()
  return route || pickupLocation
}