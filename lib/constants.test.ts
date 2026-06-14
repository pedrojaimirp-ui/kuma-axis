import { describe, it, expect } from 'vitest'
import { WITHDRAWAL_FEE_PERCENT, calculateWithdrawalFee, ROULETTE_PRIZES } from './constants'
import { REWARD_CATALOG, REWARD_CATALOG_BY_CODE } from './constants'

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

describe('REWARD_CATALOG', () => {
  it('has 4 rewards', () => {
    expect(REWARD_CATALOG).toHaveLength(4)
  })

  it('starts with the cheapest reward (extra spin)', () => {
    expect(REWARD_CATALOG[0]).toEqual({
      code: 'extra_spin',
      label: '🎰 1 giro extra de ruleta',
      description: 'Suma un giro adicional a tu ruleta de fidelización.',
      pointsCost: 50,
      kind: 'extra_spin',
    })
  })

  it('includes voucher rewards with a discount amount', () => {
    expect(REWARD_CATALOG_BY_CODE.discount_5000).toEqual({
      code: 'discount_5000',
      label: '🎟️ $5.000 de descuento',
      description: 'Cupón de $5.000 de descuento en tu próxima compra.',
      pointsCost: 500,
      kind: 'voucher',
      voucherDiscount: 5000,
    })
  })

  it('ends with the free bag reward', () => {
    expect(REWARD_CATALOG[3]).toEqual({
      code: 'free_bag',
      label: '🍫 1 bolsa de chocolate gratis (250g)',
      description: 'Cupón equivalente al valor de una bolsa, aplicado como descuento en tu próxima compra.',
      pointsCost: 1800,
      kind: 'voucher',
      voucherDiscount: 15000,
    })
  })
})
