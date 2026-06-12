import { describe, it, expect } from 'vitest'
import { generateReferralCode } from './referral'

describe('generateReferralCode', () => {
  it('returns a 6-character code', () => {
    expect(generateReferralCode()).toHaveLength(6)
  })

  it('only uses unambiguous uppercase letters and digits', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('generates different codes across calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferralCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})
