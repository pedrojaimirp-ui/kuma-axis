'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestWithdrawal(input: { amount: number; destination: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const destination = input.destination?.trim()
  if (!destination) {
    throw new Error('Indica a qué cuenta quieres que te transfiramos.')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Ingresa un monto válido.')
  }

  const { error } = await supabase.rpc('request_withdrawal', {
    p_amount: input.amount,
    p_destination: destination,
  })

  if (error) {
    console.error('request_withdrawal failed:', error.message)
    throw new Error(error.message.includes('Saldo insuficiente')
      ? 'No tienes suficiente saldo disponible para ese monto.'
      : 'No se pudo registrar la solicitud de retiro.')
  }

  revalidatePath('/billetera')
}
