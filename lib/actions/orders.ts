'use server'

import { createClient } from '@/lib/supabase/server'
import type { ShippingAddress } from '@/lib/types'

export async function createOrder(input: {
  packageId: string
  shippingAddress: ShippingAddress
  autoRenew: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('orders').insert({
    user_id: user.id,
    package_id: input.packageId,
    shipping_address: input.shippingAddress,
    auto_renew: input.autoRenew,
    status: 'pending_payment',
  })

  if (error) {
    console.error('orders insert failed:', error.message)
    throw new Error('No se pudo registrar el pedido.')
  }
}
