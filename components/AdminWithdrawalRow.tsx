'use client'

import { useState } from 'react'
import { reviewWithdrawal } from '@/lib/actions/admin'
import type { AdminWithdrawal } from '@/lib/types'

export function AdminWithdrawalRow({ withdrawal }: { withdrawal: AdminWithdrawal }) {
  const [loading, setLoading] = useState<'paid' | 'rejected' | null>(null)
  const [done, setDone] = useState(false)

  async function handleReview(status: 'paid' | 'rejected') {
    setLoading(status)
    try {
      await reviewWithdrawal(withdrawal.id, status)
      setDone(true)
    } catch (err) {
      console.error('reviewWithdrawal failed:', err instanceof Error ? err.message : err)
    } finally {
      setLoading(null)
    }
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {withdrawal.profiles?.full_name} · {withdrawal.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        Monto solicitado: <span className="font-bold">${Number(withdrawal.amount).toLocaleString('es-CO')}</span>
      </p>
      <p className="text-sm text-cacao-tostado">
        Comisión plataforma (5%): ${Number(withdrawal.fee_amount).toLocaleString('es-CO')}
      </p>
      <p className="text-sm text-cacao-tostado">
        Neto a transferir: <span className="font-bold text-kuma-dorado">${Number(withdrawal.net_amount).toLocaleString('es-CO')}</span>
      </p>
      <p className="text-sm text-cacao-tostado">Destino: {withdrawal.destination}</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => handleReview('paid')}
          disabled={loading !== null}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading === 'paid' ? 'Guardando...' : 'Marcar pagado'}
        </button>
        <button
          onClick={() => handleReview('rejected')}
          disabled={loading !== null}
          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading === 'rejected' ? 'Guardando...' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}
