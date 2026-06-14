export const WITHDRAWAL_FEE_PERCENT = 5

export function calculateWithdrawalFee(amount: number): { fee: number; net: number } {
  const fee = Math.round((amount * WITHDRAWAL_FEE_PERCENT) / 100)
  return { fee, net: amount - fee }
}
