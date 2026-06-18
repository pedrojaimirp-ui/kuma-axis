export const WITHDRAWAL_FEE_PERCENT = 0
export const RETENCION_FUENTE_PERCENT = 11

export function calculateWithdrawalFee(amount: number): {
  fee: number
  retencion: number
  net: number
} {
  const fee = 0
  const retencion = Math.round((amount * RETENCION_FUENTE_PERCENT) / 100)
  return { fee, retencion, net: amount - retencion }
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

export type RewardCode =
  | 'extra_spin'
  | 'extra_spin_3'
  | 'discount_5000'
  | 'discount_10000'
  | 'discount_30000'
  | 'free_bag'
  | 'free_2bags'
  | 'free_personal'
  | 'kit_kuma'
  | 'cata_chocolate'

export interface RewardCatalogItem {
  code: RewardCode
  label: string
  emoji: string
  description: string
  pointsCost: number
  kind: 'extra_spin' | 'voucher'
  voucherDiscount?: number
  tier: 1 | 2 | 3 | 4
  tierLabel: string
}

export const REWARD_CATALOG: RewardCatalogItem[] = [
  // TIER 1 — FÁCIL (50–500 pts)
  {
    code: 'extra_spin',
    emoji: '🎰',
    label: '1 giro extra de Ruleta KÚMA',
    description: 'Gira una vez más y gana puntos adicionales. ¡La suerte te espera!',
    pointsCost: 50,
    kind: 'extra_spin',
    tier: 1,
    tierLabel: 'Fácil',
  },
  {
    code: 'extra_spin_3',
    emoji: '🎰🎰🎰',
    label: '3 giros extra de Ruleta KÚMA',
    description: 'Triple oportunidad de ganar. ¡Multiplica tus puntos!',
    pointsCost: 120,
    kind: 'extra_spin',
    tier: 1,
    tierLabel: 'Fácil',
  },
  {
    code: 'discount_5000',
    emoji: '🎟️',
    label: '$5.000 de descuento en tu compra',
    description: 'Cupón aplicable a cualquier paquete KÚMA. ¡Chocolate más barato!',
    pointsCost: 500,
    kind: 'voucher',
    voucherDiscount: 5000,
    tier: 1,
    tierLabel: 'Fácil',
  },

  // TIER 2 — MEDIO (1.000–3.000 pts)
  {
    code: 'discount_10000',
    emoji: '🎟️',
    label: '$10.000 de descuento en tu compra',
    description: 'Ahorra $10.000 en tu próximo pedido de chocolate KÚMA.',
    pointsCost: 1000,
    kind: 'voucher',
    voucherDiscount: 10000,
    tier: 2,
    tierLabel: 'Medio',
  },
  {
    code: 'free_bag',
    emoji: '🍫',
    label: '1 bolsa de chocolate KÚMA (250g)',
    description: 'Una bolsa de chocolate 100% cacao puro sin azúcar, directo a tu puerta.',
    pointsCost: 1500,
    kind: 'voucher',
    voucherDiscount: 15000,
    tier: 2,
    tierLabel: 'Medio',
  },
  {
    code: 'discount_30000',
    emoji: '💰',
    label: '$30.000 de descuento en tu compra',
    description: 'Descuento poderoso. Casi un tercio del Paquete Personal gratis.',
    pointsCost: 2500,
    kind: 'voucher',
    voucherDiscount: 30000,
    tier: 2,
    tierLabel: 'Medio',
  },

  // TIER 3 — PREMIUM (3.000–8.000 pts)
  {
    code: 'free_2bags',
    emoji: '🍫🍫',
    label: '2 bolsas de chocolate KÚMA (500g)',
    description: '¡Doble porción de cacao puro! Comparte con quien más quieres.',
    pointsCost: 3000,
    kind: 'voucher',
    voucherDiscount: 30000,
    tier: 3,
    tierLabel: 'Premium',
  },
  {
    code: 'kit_kuma',
    emoji: '🎁',
    label: 'Kit KÚMA — Gorra + Camiseta + 1 bolsa',
    description: 'El kit completo de la familia KÚMA. Lúcete y disfruta el mejor chocolate.',
    pointsCost: 6000,
    kind: 'voucher',
    voucherDiscount: 60000,
    tier: 3,
    tierLabel: 'Premium',
  },

  // TIER 4 — EXCLUSIVO (8.000+ pts)
  {
    code: 'free_personal',
    emoji: '🏆',
    label: 'Paquete Personal KÚMA completo GRATIS',
    description: '5 bolsas de chocolate 100% cacao puro sin costo. El premio más codiciado.',
    pointsCost: 8000,
    kind: 'voucher',
    voucherDiscount: 90000,
    tier: 4,
    tierLabel: 'Exclusivo',
  },
  {
    code: 'cata_chocolate',
    emoji: '✨',
    label: 'Experiencia Cata de Chocolate KÚMA',
    description: 'Una sesión privada de cata de chocolates con el equipo KÚMA. Única e irrepetible.',
    pointsCost: 12000,
    kind: 'voucher',
    voucherDiscount: 120000,
    tier: 4,
    tierLabel: 'Exclusivo',
  },
]

export const REWARD_CATALOG_BY_CODE: Record<RewardCode, RewardCatalogItem> = Object.fromEntries(
  REWARD_CATALOG.map((item) => [item.code, item])
) as Record<RewardCode, RewardCatalogItem>
