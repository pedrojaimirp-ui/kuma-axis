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
