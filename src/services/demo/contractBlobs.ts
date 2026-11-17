/** In-memory signed contracts for mock/demo mode (keyed by booking id). */
const contractBlobs = new Map<string, Blob>()

export function storeDemoContractBlob(bookingId: string, blob: Blob) {
  contractBlobs.set(bookingId, blob)
}

export function getDemoContractBlob(bookingId: string) {
  return contractBlobs.get(bookingId)
}