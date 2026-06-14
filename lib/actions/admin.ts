'use server'

import { createClient } from '@/lib/supabase/server'

export async function reviewOrder(orderId: string, status: 'paid' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('orders')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select('id')

  if (error) {
    console.error('orders update failed:', error.message)
    throw new Error('No se pudo actualizar el pedido.')
  }

  if (!data?.length) {
    throw new Error('Este pedido ya fue revisado o no existe.')
  }
}

export async function reviewWithdrawal(id: string, status: 'paid' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  if (status === 'rejected') {
    const { error } = await supabase.rpc('reject_withdrawal', { p_id: id })
    if (error) {
      console.error('reject_withdrawal failed:', error.message)
      throw new Error('No se pudo rechazar el retiro.')
    }
    return
  }

  const { error } = await supabase.rpc('approve_withdrawal', { p_id: id })

  if (error) {
    console.error('approve_withdrawal failed:', error.message)
    throw new Error('No se pudo actualizar el retiro.')
  }
}
