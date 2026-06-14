import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WithdrawalForm } from '@/components/WithdrawalForm'
import { LoyaltyPointsCard } from '@/components/LoyaltyPointsCard'
import type { RewardVoucher, Wallet, WalletTransaction } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  commission_l1: 'Recompensa de fidelización nivel 1',
  commission_l2: 'Recompensa de fidelización nivel 2',
  commission_l3: 'Recompensa de fidelización nivel 3',
  commission_l4: 'Recompensa de fidelización nivel 4',
  owner_global: 'Bono de fundador',
  unlock: 'Puntos liberados',
  purchase_with_balance: 'Compra con puntos',
  withdrawal_request: 'Solicitud de redención',
  withdrawal_rejected: 'Redención rechazada (puntos devueltos)',
  roulette_prize: 'Premio de fidelización (ruleta) — histórico',
}

export default async function BilleteraPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (walletError) {
    console.error('wallets select failed:', walletError.message)
  }

  const { data: transactions, error: txError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (txError) {
    console.error('wallet_transactions select failed:', txError.message)
  }

  const { data: vouchers, error: voucherError } = await supabase
    .from('reward_vouchers')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'available')

  if (voucherError) {
    console.error('reward_vouchers select failed:', voucherError.message)
  }

  const w = wallet as Wallet | null
  const available = w?.balance_available ?? 0
  const locked = w?.balance_locked ?? 0
  const points = w?.loyalty_points_balance ?? 0

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-cacao-tostado">Comisiones por venta disponibles</p>
        <p className="text-3xl font-bold text-kuma-dorado">${available.toLocaleString('es-CO')}</p>

        {locked > 0 && (
          <p className="mt-2 rounded-lg bg-cacao-fresco/10 p-3 text-sm text-cacao-tostado">
            🔒 ${locked.toLocaleString('es-CO')} bloqueados — Activa tu recompra y disfruta de tus
            recompensas.
          </p>
        )}

        <div className="mt-4">
          <WithdrawalForm available={available} />
        </div>
      </div>

      <LoyaltyPointsCard points={points} vouchers={(vouchers as RewardVoucher[] | null) ?? []} />

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-cacao-oscuro">Movimientos</h2>
        {!transactions?.length && (
          <p className="text-cacao-tostado">Todavía no tienes movimientos.</p>
        )}
        <div className="space-y-2">
          {(transactions as WalletTransaction[] | null)?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between border-b border-cacao-fresco/10 pb-2 text-sm">
              <div>
                <p className="text-cacao-oscuro">{TYPE_LABELS[tx.type] ?? tx.type}</p>
                <p className="text-cacao-tostado">{new Date(tx.created_at).toLocaleDateString('es-CO')}</p>
              </div>
              <p className={tx.amount >= 0 ? 'font-semibold text-verde-natural' : 'font-semibold text-red-600'}>
                {tx.amount >= 0 ? '+' : ''}${tx.amount.toLocaleString('es-CO')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
