'use server'

import { createClient } from '@/lib/supabase/server'
import type { PackageCode, ShippingAddress } from '@/lib/types'

function validateShippingAddress(input: ShippingAddress): ShippingAddress {
  const calle = input.calle?.trim()
  const ciudad = input.ciudad?.trim()
  const departamento = input.departamento?.trim()
  const telefono = input.telefono?.trim()

  if (!calle || !ciudad || !departamento || !telefono) {
    throw new Error('Completa todos los campos de la dirección.')
  }

  return { calle, ciudad, departamento, telefono }
}

export async function createOrder(input: {
  packageCode: PackageCode
  shippingAddress: ShippingAddress
  autoRenew: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const shippingAddress = validateShippingAddress(input.shippingAddress)

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .select('id')
    .eq('code', input.packageCode)
    .single()

  if (pkgError || !pkg) {
    console.error('packages select failed:', pkgError?.message)
    throw new Error('El paquete seleccionado no existe.')
  }

  const { error } = await supabase.from('orders').insert({
    user_id: user.id,
    package_id: pkg.id,
    shipping_address: shippingAddress,
    auto_renew: input.autoRenew,
    status: 'pending_payment',
  })

  if (error) {
    console.error('orders insert failed:', error.message)
    throw new Error('No se pudo registrar el pedido.')
  }
}
