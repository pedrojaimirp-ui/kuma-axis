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
      {order.payment_reference && (
        <p className="text-sm text-cacao-tostado">
          Referencia de pago: <span className="font-semibold text-cacao-oscuro">{order.payment_reference}</span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {order.profiles?.phone && (
          <>
            <a
              href={`tel:${order.profiles.phone}`}
              className="rounded-lg bg-kuma-dorado px-3 py-1 text-sm font-semibold text-cacao-oscuro"
            >
              📞 Llamar
            </a>
            <a
              href={`https://wa.me/57${order.profiles.phone}?text=Hola%20${encodeURIComponent(order.profiles.full_name ?? '')}%2C%20soy%20KÚMA%20CACAO%20AXIS.%20Te%20contactamos%20por%20tu%20pedido%20de%20${encodeURIComponent(order.packages?.name ?? '')}%20por%20valor%20de%20%24${order.packages ? Number(order.packages.price).toLocaleString('es-CO') : ''}%20%F0%9F%8D%AB`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-500 px-3 py-1 text-sm font-semibold text-white"
            >
              💬 WhatsApp
            </a>
          </>
        )}
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
