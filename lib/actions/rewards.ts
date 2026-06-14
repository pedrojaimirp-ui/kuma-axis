'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { RewardCode } from '@/lib/constants'

export async function redeemReward(code: RewardCode) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.rpc('redeem_loyalty_reward', { p_reward_code: code })

  if (error) {
    console.error('redeem_loyalty_reward failed:', error.message)
    throw new Error(
      error.message.includes('No tienes suficientes puntos')
        ? 'No tienes suficientes puntos de fidelización para este premio.'
        : 'No se pudo canjear el premio.'
    )
  }

  revalidatePath('/billetera')
  revalidatePath('/billetera/canjear')
}
