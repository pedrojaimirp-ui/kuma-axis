import { describe, it, expect } from 'vitest'
import { WITHDRAWAL_FEE_PERCENT, calculateWithdrawalFee, ROULETTE_PRIZES } from './constants'

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

describe('ROULETTE_PRIZES', () => {
  it('has 19 prizes', () => {
    expect(ROULETTE_PRIZES).toHaveLength(19)
  })

  it('starts with the free-spin prize', () => {
    expect(ROULETTE_PRIZES[0]).toEqual({
      match: 'Vuelve y juega',
      display: '🍫 Otra vez',
      amount: 0,
    })
  })

  it('ends with the top $100.000 prize', () => {
    expect(ROULETTE_PRIZES[18]).toEqual({
      match: '$100.000',
      display: '💰 $100.000',
      amount: 100000,
    })
  })
})
