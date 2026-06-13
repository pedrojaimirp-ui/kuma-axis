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
  paymentReference?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const shippingAddress = validateShippingAddress(input.shippingAddress)
  const paymentReference = input.paymentReference?.trim() || null

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
    payment_reference: paymentReference,
    status: 'pending_payment',
  })

  if (error) {
    console.error('orders insert failed:', error.message)
    throw new Error('No se pudo registrar el pedido.')
  }
}

export async function purchaseWithBalance(input: {
  packageCode: PackageCode
  shippingAddress: ShippingAddress
  autoRenew: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const shippingAddress = validateShippingAddress(input.shippingAddress)

  const { error } = await supabase.rpc('purchase_with_balance', {
    p_package_code: input.packageCode,
    p_shipping_address: shippingAddress,
    p_auto_renew: input.autoRenew,
  })

  if (error) {
    console.error('purchase_with_balance failed:', error.message)
    throw new Error(error.message.includes('Saldo insuficiente')
      ? 'No tienes suficiente saldo $KCA para este paquete.'
      : 'No se pudo completar la compra con saldo.')
  }
}
