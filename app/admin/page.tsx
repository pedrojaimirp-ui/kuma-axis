import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminOrderRow } from '@/components/AdminOrderRow'
import { AdminWithdrawalRow } from '@/components/AdminWithdrawalRow'
import type { AdminOrder, AdminWithdrawal } from '@/lib/types'

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
    .select('id, created_at, shipping_address, payment_reference, profiles!orders_user_id_fkey(full_name, phone), packages(name, price)')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true })

  if (ordersError) {
    console.error('orders select failed:', ordersError.message)
  }

  const { data: withdrawals, error: withdrawalsError } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, fee_amount, net_amount, destination, created_at, profiles!withdrawal_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (withdrawalsError) {
    console.error('withdrawal_requests select failed:', withdrawalsError.message)
  }

  const { data: settings, error: settingsError } = await supabase
    .from('platform_settings')
    .select('withdrawal_fees_accumulated')
    .eq('id', 1)
    .single()

  if (settingsError) {
    console.error('platform_settings select failed:', settingsError.message)
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

      <p className="mt-6 text-sm text-cacao-tostado">
        💰 Fondos de sostenimiento acumulados: $
        {Number(settings?.withdrawal_fees_accumulated ?? 0).toLocaleString('es-CO')}
      </p>
      <h1 className="mb-4 mt-2 text-xl font-bold text-cacao-oscuro">Retiros pendientes</h1>
      <div className="space-y-3">
        {!withdrawals?.length && <p className="text-cacao-tostado">No hay retiros pendientes.</p>}
        {(withdrawals as unknown as AdminWithdrawal[] | null)?.map((w) => (
          <AdminWithdrawalRow key={w.id} withdrawal={w} />
        ))}
      </div>
    </div>
  )
}
