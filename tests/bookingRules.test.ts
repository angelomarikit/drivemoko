import { describe, expect, it } from 'vitest'
import { canTransition } from '@/utils/bookingRules'

describe('booking status machine', () => {
  it('allows admin confirm from pending', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
  })
  it('blocks skip to completed from pending', () => {
    expect(canTransition('pending', 'completed')).toBe(false)
  })
})