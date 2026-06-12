import { describe, it, expect } from 'vitest'
import { isValidPassword } from './validation'

describe('isValidPassword', () => {
  it('accepts passwords with 8 or more characters', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('a-much-longer-password')).toBe(true)
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('')).toBe(false)
  })
})
