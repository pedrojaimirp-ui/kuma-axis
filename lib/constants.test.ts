import { describe, it, expect } from 'vitest'
import { WITHDRAWAL_FEE_PERCENT, calculateWithdrawalFee } from './constants'

describe('WITHDRAWAL_FEE_PERCENT', () => {
  it('is 5', () => {
    expect(WITHDRAWAL_FEE_PERCENT).toBe(5)
  })
})

describe('calculateWithdrawalFee', () => {
  it('computes 5% fee and net for a round amount', () => {
    expect(calculateWithdrawalFee(10000)).toEqual({ fee: 500, net: 9500 })
  })

  it('rounds the fee to the nearest peso', () => {
    expect(calculateWithdrawalFee(33)).toEqual({ fee: 2, net: 31 })
  })

  it('returns zero fee and net for zero amount', () => {
    expect(calculateWithdrawalFee(0)).toEqual({ fee: 0, net: 0 })
  })
})
