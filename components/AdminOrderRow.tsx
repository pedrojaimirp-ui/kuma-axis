'use client'

import { useState } from 'react'
import { reviewOrder } from '@/lib/actions/admin'
import type { AdminOrder } from '@/lib/types'

export function AdminOrderRow({ order }: { order: AdminOrder }) {
  const [loading, setLoading] = useState<'paid' | 'rejected' | null>(null)
  const [done, setDone] = useState(false)

  async function handleReview(status: 'paid' | 'rejected') {
    setLoading(status)
    try {
      await reviewOrder(order.id, status)
      setDone(true)
    } catch (err) {
      console.error('reviewOrder failed:', err instanceof Error ? err.message : err)
    } finally {
      setLoading(null)
    }
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {order.profiles?.full_name} · {order.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        {order.packages?.name} · ${order.packages ? Number(order.packages.price).toLocaleString('es-CO') : ''}
      </p>
      <p className="text-sm text-cacao-tostado">
        {order.shipping_address.calle}, {order.shipping_address.ciudad},{' '}
        {order.shipping_address.departamento} · Tel: {order.shipping_address.telefono}
      </p>
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
