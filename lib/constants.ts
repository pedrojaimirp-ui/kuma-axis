export const WITHDRAWAL_FEE_PERCENT = 5
export const RETENCION_FUENTE_PERCENT = 11

export function calculateWithdrawalFee(amount: number): {
  fee: number
  retencion: number
  net: number
} {
  const fee = Math.round((amount * WITHDRAWAL_FEE_PERCENT) / 100)
  const retencion = Math.round((amount * RETENCION_FUENTE_PERCENT) / 100)
  return { fee, retencion, net: amount - fee - retencion }
}

export interface RoulettePrize {
  match: string
  display: string
  amount: number
}

export const ROULETTE_PRIZES: RoulettePrize[] = [
  { match: 'Vuelve y juega', display: '🍫 Otra vez', amount: 0 },
  { match: '$50', display: '🍫 $50', amount: 50 },
  { match: '$100', display: '🍫 $100', amount: 100 },
  { match: '$150', display: '🍫 $150', amount: 150 },
  { match: '$200', display: '🍫 $200', amount: 200 },
  { match: '$250', display: '🍫 $250', amount: 250 },
  { match: '$300', display: '🍫 $300', amount: 300 },
  { match: '$350', display: '🍫 $350', amount: 350 },
  { match: '$400', display: '🍫 $400', amount: 400 },
  { match: '$450', display: '🍫 $450', amount: 450 },
  { match: '$500', display: '🍫 $500', amount: 500 },
  { match: '$1.000', display: '🍫 $1.000', amount: 1000 },
  { match: '$2.000', display: '🍫 $2.000', amount: 2000 },
  { match: '$3.000', display: '🍫 $3.000', amount: 3000 },
  { match: '$5.000', display: '🍫 $5.000', amount: 5000 },
  { match: '$10.000', display: '💰 $10.000', amount: 10000 },
  { match: '$20.000', display: '💰 $20.000', amount: 20000 },
  { match: '$50.000', display: '💰 $50.000', amount: 50000 },
  { match: '$100.000', display: '💰 $100.000', amount: 100000 },
]

export type RewardCode = 'extra_spin' | 'discount_5000' | 'discount_10000' | 'free_bag'

export interface RewardCatalogItem {
  code: RewardCode
  label: string
  description: string
  pointsCost: number
  kind: 'extra_spin' | 'voucher'
  voucherDiscount?: number
}

export const REWARD_CATALOG: RewardCatalogItem[] = [
  {
    code: 'extra_spin',
    label: '🎰 1 giro extra de ruleta',
    description: 'Suma un giro adicional a tu ruleta de fidelización.',
    pointsCost: 50,
    kind: 'extra_spin',
  },
  {
    code: 'discount_5000',
    label: '🎟️ $5.000 de descuento',
    description: 'Cupón de $5.000 de descuento en tu próxima compra.',
    pointsCost: 500,
    kind: 'voucher',
    voucherDiscount: 5000,
  },
  {
    code: 'discount_10000',
    label: '🎟️ $10.000 de descuento',
    description: 'Cupón de $10.000 de descuento en tu próxima compra.',
    pointsCost: 1000,
    kind: 'voucher',
    voucherDiscount: 10000,
  },
  {
    code: 'free_bag',
    label: '🍫 1 bolsa de chocolate gratis (250g)',
    description: 'Cupón equivalente al valor de una bolsa, aplicado como descuento en tu próxima compra.',
    pointsCost: 1800,
    kind: 'voucher',
    voucherDiscount: 15000,
  },
]

export const REWARD_CATALOG_BY_CODE: Record<RewardCode, RewardCatalogItem> = Object.fromEntries(
  REWARD_CATALOG.map((item) => [item.code, item])
) as Record<RewardCode, RewardCatalogItem>
