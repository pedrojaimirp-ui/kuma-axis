'use client'

import { useState } from 'react'
import { markOrderDelivered } from '@/lib/actions/admin'
import type { AdminOrder } from '@/lib/types'

export function AdminPaidOrderRow({ order }: { order: AdminOrder }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelivered() {
    setLoading(true)
    setError(null)
    try {
      await markOrderDelivered(order.id)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
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
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleDelivered}
          disabled={loading}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Marcar como entregado'}
        </button>
      </div>
    </div>
  )
}
