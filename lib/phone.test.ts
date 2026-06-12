import { describe, it, expect } from 'vitest'
import { isValidColombianPhone, toSyntheticEmail } from './phone'

describe('isValidColombianPhone', () => {
  it('accepts valid 10-digit numbers starting with 3', () => {
    expect(isValidColombianPhone('3001234567')).toBe(true)
  })

  it('rejects numbers not starting with 3', () => {
    expect(isValidColombianPhone('2001234567')).toBe(false)
  })

  it('rejects numbers with the wrong length', () => {
    expect(isValidColombianPhone('300123456')).toBe(false)
    expect(isValidColombianPhone('30012345678')).toBe(false)
  })

  it('rejects non-numeric input', () => {
    expect(isValidColombianPhone('300123456a')).toBe(false)
  })
})

describe('toSyntheticEmail', () => {
  it('builds the kumaaxis.app synthetic email from a phone number', () => {
    expect(toSyntheticEmail('3001234567')).toBe('3001234567@kumaaxis.app')
  })
})
