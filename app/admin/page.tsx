import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminOrderRow } from '@/components/AdminOrderRow'
import type { AdminOrder } from '@/lib/types'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles role lookup failed:', profileError.message)
  }

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    redirect('/inicio')
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, created_at, shipping_address, profiles(full_name, phone), packages(name, price)')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true })

  if (ordersError) {
    console.error('orders select failed:', ordersError.message)
  }

  return (
    <div className="min-h-screen bg-blanco-cacao p-4">
      <h1 className="mb-4 text-xl font-bold text-cacao-oscuro">Pedidos pendientes</h1>
      <div className="space-y-3">
        {!orders?.length && <p className="text-cacao-tostado">No hay pedidos pendientes.</p>}
        {(orders as unknown as AdminOrder[] | null)?.map((order) => (
          <AdminOrderRow key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
