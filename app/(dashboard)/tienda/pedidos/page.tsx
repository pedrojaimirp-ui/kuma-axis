import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Pendiente de verificación', className: 'text-kuma-dorado' },
  paid: { label: 'Pagado', className: 'text-verde-natural' },
  rejected: { label: 'Rechazado', className: 'text-red-600' },
}

export default async function PedidosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, created_at, packages(name, price)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('orders select failed:', ordersError.message)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Mis pedidos</h1>
      {!orders?.length && <p className="text-cacao-tostado">Aún no tienes pedidos.</p>}
      {orders?.map((order) => {
        const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending_payment
        const pkg = order.packages as unknown as { name: string; price: number } | null
        return (
          <div key={order.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold text-cacao-oscuro">{pkg?.name}</p>
              <p className="text-sm text-cacao-tostado">
                ${pkg ? Number(pkg.price).toLocaleString('es-CO') : '—'} ·{' '}
                {new Date(order.created_at).toLocaleDateString('es-CO')}
              </p>
            </div>
            <span className={`text-sm font-semibold ${status.className}`}>{status.label}</span>
          </div>
        )
      })}
    </div>
  )
}
