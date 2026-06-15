import { describe, it, expect } from 'vitest'
import { businessDaysBetween } from './dates'

describe('businessDaysBetween', () => {
  it('returns 0 for the same day', () => {
    const day = new Date('2026-06-15T10:00:00Z') // Monday
    expect(businessDaysBetween(day, day)).toBe(0)
  })

  it('counts only weekdays across a weekend', () => {
    const friday = new Date('2026-06-12T10:00:00Z')
    const monday = new Date('2026-06-15T10:00:00Z')
    expect(businessDaysBetween(friday, monday)).toBe(1)
  })

  it('returns 5 for exactly 5 business days later', () => {
    const monday = new Date('2026-06-15T10:00:00Z')
    const nextMonday = new Date('2026-06-22T10:00:00Z')
    expect(businessDaysBetween(monday, nextMonday)).toBe(5)
  })

  it('returns more than 5 when over the limit', () => {
    const monday = new Date('2026-06-15T10:00:00Z')
    const tuesdayAfter = new Date('2026-06-23T10:00:00Z')
    expect(businessDaysBetween(monday, tuesdayAfter)).toBe(6)
  })
})
