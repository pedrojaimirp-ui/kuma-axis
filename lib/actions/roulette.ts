'use server'

import { createClient } from '@/lib/supabase/server'
import type { SpinCredits } from '@/lib/types'

export async function claimDailySpins(): Promise<SpinCredits> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase.rpc('claim_daily_spins')

  if (error) {
    console.error('claim_daily_spins failed:', error.message)
    throw new Error('No se pudieron cargar tus giros.')
  }

  const row = data?.[0]
  return {
    daily_spins_remaining: row?.daily_spins_remaining ?? 0,
    referral_spins_balance: row?.referral_spins_balance ?? 0,
  }
}

export async function spinRoulette(): Promise<{ prize_label: string; prize_amount: number }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase.rpc('spin_roulette')

  if (error) {
    console.error('spin_roulette failed:', error.message)
    throw new Error(
      error.message.includes('No tienes giros')
        ? 'No tienes giros disponibles.'
        : 'No se pudo girar la ruleta.'
    )
  }

  const row = data?.[0]
  return {
    prize_label: row?.prize_label ?? '',
    prize_amount: Number(row?.prize_amount ?? 0),
  }
}
