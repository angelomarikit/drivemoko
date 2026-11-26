import { describe, expect, it } from 'vitest'
import { blocksCalendar, canTransition } from '@/utils/bookingRules'

describe('booking status machine', () => {
  it('allows admin confirm from pending', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
  })
  it('blocks skip to completed from pending', () => {
    expect(canTransition('pending', 'completed')).toBe(false)
  })
})

describe('calendar holds', () => {
  it('does not block on pending when hold pending is off', () => {
    expect(blocksCalendar('pending', false)).toBe(false)
  })
  it('blocks on confirmed regardless of hold pending', () => {
    expect(blocksCalendar('confirmed', false)).toBe(true)
  })
})