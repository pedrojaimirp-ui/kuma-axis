import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminOrderRow } from '@/components/AdminOrderRow'
import { AdminWithdrawalRow } from '@/components/AdminWithdrawalRow'
import { AdminPaidOrderRow } from '@/components/AdminPaidOrderRow'
import { AdminReturnRow } from '@/components/AdminReturnRow'
import type { AdminOrder, AdminWithdrawal, AdminReturnRequest } from '@/lib/types'

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

  const { data: paidOrders, error: paidOrdersError } = await supabase
    .from('orders')
    .select('id, created_at, shipping_address, payment_reference, profiles!orders_user_id_fkey(full_name, phone), packages(name, price)')
    .eq('status', 'paid')
    .order('created_at', { ascending: true })

  if (paidOrdersError) {
    console.error('paid orders select failed:', paidOrdersError.message)
  }

  const { data: returnRequests, error: returnRequestsError } = await supabase
    .from('return_requests')
    .select('id, reason, created_at, orders(id, packages(name)), profiles!return_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (returnRequestsError) {
    console.error('return_requests select failed:', returnRequestsError.message)
  }

  const { data: withdrawals, error: withdrawalsError } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, fee_amount, net_amount, destination, created_at, profiles!withdrawal_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (withdrawalsError) {
    console.error('withdrawal_requests select failed:', withdrawalsError.message)
  }

  const { data: reservations, error: reservationsError } = await supabase
    .from('reservations')
    .select('packages(name)')

  if (reservationsError) {
    console.error('reservations select failed:', reservationsError.message)
  }

  const reservationCounts: Record<string, number> = {}
  for (const r of (reservations ?? [])) {
    const name = (r.packages as unknown as { name: string } | null)?.name ?? 'Desconocido'
    reservationCounts[name] = (reservationCounts[name] ?? 0) + 1
  }

  const { data: settings, error: settingsError } = await supabase
    .from('platform_settings')
    .select('withdrawal_fees_accumulated, roulette_fund_accumulated, roulette_fund_percent')
    .eq('id', 1)
    .single()

  if (settingsError) {
    console.error('platform_settings select failed:', settingsError.message)
  }

  // ── Fondo Ruleta: puntos emitidos por día (últimos 7 días) ──────────────
  const { data: spinsByDay } = await supabase
    .from('spin_history')
    .select('prize_amount, created_at')
    .gte('created_at', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  // Agrupar por fecha
  const spinDayMap: Record<string, number> = {}
  for (const s of (spinsByDay ?? [])) {
    const day = new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    spinDayMap[day] = (spinDayMap[day] ?? 0) + Number(s.prize_amount)
  }
  const totalPuntosEmitidos7d = Object.values(spinDayMap).reduce((a, b) => a + b, 0)

  // ── Cupones pendientes y usados ─────────────────────────────────────────
  const { data: vouchersAvailable } = await supabase
    .from('reward_vouchers')
    .select('discount_amount')
    .eq('status', 'available')

  const { data: vouchersUsed } = await supabase
    .from('reward_vouchers')
    .select('discount_amount')
    .eq('status', 'used')

  const fondoPendiente = (vouchersAvailable ?? []).reduce((a, v) => a + Number(v.discount_amount), 0)
  const fondoEntregado = (vouchersUsed ?? []).reduce((a, v) => a + Number(v.discount_amount), 0)

  // ── Puntos totales en circulación ───────────────────────────────────────
  const { data: walletPts } = await supabase
    .from('wallets')
    .select('loyalty_points_balance')

  const puntosEnCirculacion = (walletPts ?? []).reduce((a, w) => a + Number(w.loyalty_points_balance), 0)

  return (
    <div className="min-h-screen bg-blanco-cacao p-4">
      <div className="mb-5 flex justify-end">
        <a
          href="/admin/comisiones"
          className="rounded-lg bg-kuma-dorado px-4 py-2 text-sm font-bold text-cacao-oscuro hover:opacity-90"
        >
          📊 Reporte de comisiones (DIAN)
        </a>
      </div>
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-cacao-oscuro">📦 Pre-reservas de paquetes</h2>
        {Object.keys(reservationCounts).length === 0 ? (
          <p className="text-sm text-cacao-tostado">Aún no hay reservas.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(reservationCounts).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-blanco-cacao px-3 py-2">
                <span className="text-sm text-cacao-oscuro">{name}</span>
                <span className="font-bold text-kuma-dorado">{count} reserva{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
            <p className="pt-1 text-right text-sm font-semibold text-cacao-oscuro">
              Total: {Object.values(reservationCounts).reduce((a, b) => a + b, 0)} personas
            </p>
          </div>
        )}
      </div>

      {/* ── FONDO RULETA KÚMA ── */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-cacao-oscuro to-[#2a1a0e] px-4 py-3 flex items-center gap-2">
          <span className="text-xl">🎰</span>
          <h2 className="text-base font-extrabold text-kuma-dorado">Fondo Ruleta KÚMA</h2>
          <span className="ml-auto text-xs text-blanco-cacao/40">últimos 7 días</span>
        </div>
        <div className="bg-white p-4 space-y-4">

          {/* Fondo acumulado desde ventas */}
          <div className="rounded-xl bg-gradient-to-r from-kuma-dorado/20 to-kuma-dorado/5 border border-kuma-dorado/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold text-cacao-tostado uppercase tracking-widest">
                💰 Fondo acumulado desde ventas
              </p>
              <p className="text-2xl font-extrabold text-cacao-oscuro mt-0.5">
                ${Number(settings?.roulette_fund_accumulated ?? 0).toLocaleString('es-CO')}
              </p>
              <p className="text-[10px] text-cacao-tostado/60 mt-0.5">
                {Number(settings?.roulette_fund_percent ?? 6.11)}% de cada venta se destina automáticamente
              </p>
            </div>
            <span className="text-4xl opacity-20">🎰</span>
          </div>

          {/* Resumen en 3 tarjetas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-verde-natural/10 border border-verde-natural/20 p-3 text-center">
              <p className="text-[10px] font-bold text-verde-natural uppercase tracking-wide">Premios pendientes</p>
              <p className="text-lg font-extrabold text-verde-natural">
                ${fondoPendiente.toLocaleString('es-CO')}
              </p>
              <p className="text-[9px] text-cacao-tostado/60">{vouchersAvailable?.length ?? 0} cupones sin usar</p>
            </div>
            <div className="rounded-xl bg-kuma-dorado/10 border border-kuma-dorado/20 p-3 text-center">
              <p className="text-[10px] font-bold text-cacao-tostado uppercase tracking-wide">Pts en circulación</p>
              <p className="text-lg font-extrabold text-cacao-oscuro">
                {puntosEnCirculacion.toLocaleString('es-CO')}
              </p>
              <p className="text-[9px] text-cacao-tostado/60">puntos activos</p>
            </div>
            <div className="rounded-xl bg-blanco-cacao border border-cacao-fresco/20 p-3 text-center">
              <p className="text-[10px] font-bold text-cacao-tostado uppercase tracking-wide">Ya entregado</p>
              <p className="text-lg font-extrabold text-cacao-oscuro">
                ${fondoEntregado.toLocaleString('es-CO')}
              </p>
              <p className="text-[9px] text-cacao-tostado/60">{vouchersUsed?.length ?? 0} cupones usados</p>
            </div>
          </div>

          {/* Puntos emitidos por día */}
          <div>
            <p className="text-xs font-extrabold text-cacao-oscuro uppercase tracking-wide mb-2">
              🎰 Puntos emitidos por día
            </p>
            {Object.keys(spinDayMap).length === 0 ? (
              <p className="text-xs text-cacao-tostado/60">Sin giros en los últimos 7 días.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(spinDayMap)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([day, pts]) => {
                    const pct = totalPuntosEmitidos7d > 0 ? Math.round((pts / totalPuntosEmitidos7d) * 100) : 0
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-14 text-xs text-cacao-tostado shrink-0">{day}</span>
                        <div className="flex-1 h-5 rounded-full bg-blanco-cacao overflow-hidden">
                          <div
                            className="h-5 rounded-full bg-kuma-dorado flex items-center pl-2 transition-all"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          >
                            <span className="text-[9px] font-bold text-cacao-oscuro whitespace-nowrap">
                              {pts.toLocaleString('es-CO')} pts
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-cacao-tostado/60 w-8 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                <p className="pt-1 text-right text-xs font-bold text-cacao-oscuro">
                  Total 7 días: {totalPuntosEmitidos7d.toLocaleString('es-CO')} pts
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      <h1 className="mb-4 text-xl font-bold text-cacao-oscuro">Pedidos pendientes</h1>
      <div className="space-y-3">
        {!orders?.length && <p className="text-cacao-tostado">No hay pedidos pendientes.</p>}
        {(orders as unknown as AdminOrder[] | null)?.map((order) => (
          <AdminOrderRow key={order.id} order={order} />
        ))}
      </div>

      {/* Sección bodega */}
      <div className="mt-6 mb-3 rounded-xl bg-cacao-oscuro px-4 py-3 flex items-center gap-2">
        <span className="text-xl">📦</span>
        <div>
          <h1 className="text-base font-extrabold text-kuma-dorado">Bodega — Listos para despachar</h1>
          <p className="text-xs text-blanco-cacao/50">
            {paidOrders?.length ?? 0} pedido{(paidOrders?.length ?? 0) !== 1 ? 's' : ''} pendiente{(paidOrders?.length ?? 0) !== 1 ? 's' : ''} de entrega
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {!paidOrders?.length && (
          <p className="rounded-xl bg-white p-4 text-sm text-cacao-tostado text-center">
            🎉 Todo despachado — no hay pedidos pendientes.
          </p>
        )}
        {(paidOrders as unknown as AdminOrder[] | null)?.map((order) => (
          <AdminPaidOrderRow key={order.id} order={order} />
        ))}
      </div>

      <h1 className="mb-4 mt-6 text-xl font-bold text-cacao-oscuro">Devoluciones pendientes</h1>
      <div className="space-y-3">
        {!returnRequests?.length && <p className="text-cacao-tostado">No hay devoluciones pendientes.</p>}
        {(returnRequests as unknown as AdminReturnRequest[] | null)?.map((r) => (
          <AdminReturnRow key={r.id} request={r} />
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
