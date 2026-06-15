'use client'

import { useState } from 'react'
import { reviewReturn } from '@/lib/actions/admin'
import type { AdminReturnRequest } from '@/lib/types'

export function AdminReturnRow({ request }: { request: AdminReturnRequest }) {
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReview(status: 'approved' | 'rejected') {
    setLoading(status)
    setError(null)
    try {
      await reviewReturn(request.id, status)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(null)
    }
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {request.profiles?.full_name} · {request.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        Paquete: {request.orders?.packages?.name ?? '—'}
      </p>
      <p className="text-sm text-cacao-tostado">Motivo: {request.reason}</p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => handleReview('approved')}
          disabled={loading !== null}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading === 'approved' ? 'Guardando...' : 'Aprobar'}
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
