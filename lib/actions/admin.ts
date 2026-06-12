'use server'

import { createClient } from '@/lib/supabase/server'

export async function reviewOrder(orderId: string, status: 'paid' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('orders')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) {
    console.error('orders update failed:', error.message)
    throw new Error('No se pudo actualizar el pedido.')
  }
}
