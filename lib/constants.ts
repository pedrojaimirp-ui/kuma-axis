export const WITHDRAWAL_FEE_PERCENT = 5

export function calculateWithdrawalFee(amount: number): { fee: number; net: number } {
  const fee = Math.round((amount * WITHDRAWAL_FEE_PERCENT) / 100)
  return { fee, net: amount - fee }
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
]
