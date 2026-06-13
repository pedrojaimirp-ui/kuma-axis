import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WithdrawalForm } from '@/components/WithdrawalForm'
import type { Wallet, WalletTransaction } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  commission_l1: 'Comisión nivel 1',
  commission_l2: 'Comisión nivel 2',
  commission_l3: 'Comisión nivel 3',
  commission_l4: 'Comisión nivel 4',
  owner_global: 'Comisión global (dueño)',
  unlock: 'Saldo desbloqueado',
  purchase_with_balance: 'Compra con saldo',
  withdrawal_request: 'Solicitud de retiro',
  withdrawal_rejected: 'Retiro rechazado (saldo devuelto)',
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

  const w = wallet as Wallet | null
  const available = w?.balance_available ?? 0
  const locked = w?.balance_locked ?? 0

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-cacao-tostado">Saldo disponible</p>
        <p className="text-3xl font-bold text-verde-natural">
          ${available.toLocaleString('es-CO')} $KCA
        </p>

        {locked > 0 && (
          <p className="mt-2 rounded-lg bg-cacao-fresco/10 p-3 text-sm text-cacao-tostado">
            🔒 ${locked.toLocaleString('es-CO')} $KCA congelados — Activa tu recompra y
            disfruta de tus ganancias.
          </p>
        )}

        <div className="mt-4">
          <WithdrawalForm available={available} />
        </div>
      </div>

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
