'use client'

import { useState } from 'react'
import { markOrderDelivered } from '@/lib/actions/admin'
import type { AdminOrder } from '@/lib/types'

export function AdminPaidOrderRow({ order }: { order: AdminOrder }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const addr = order.shipping_address
  const fullAddress =
    `${addr.calle}, ${addr.ciudad}, ${addr.departamento} · Tel: ${addr.telefono}`

  async function handleDelivered() {
    if (!confirm('¿Confirmas que este pedido ya fue entregado al cliente?')) return
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

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(fullAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silencioso
    }
  }

  function handleWhatsApp() {
    const phone = addr.telefono.startsWith('57') ? addr.telefono : `57${addr.telefono}`
    const msg =
      `Hola ${order.profiles?.full_name} 👋, te escribimos del equipo *KÚMA CACAO AXIS*.\n\n` +
      `Tu pedido *${order.packages?.name}* está listo y en camino a:\n` +
      `📍 ${addr.calle}, ${addr.ciudad}, ${addr.departamento}\n\n` +
      `Pronto recibirás tu chocolate 🍫. ¡Gracias por confiar en KÚMA!`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (done) return (
    <div className="rounded-xl bg-verde-natural/10 border border-verde-natural/30 px-4 py-3 text-sm text-verde-natural font-semibold">
      ✅ Entregado — {order.profiles?.full_name}
    </div>
  )

  const fecha = new Date(order.created_at).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-cacao-fresco/10">

      {/* Encabezado */}
      <div className="bg-cacao-oscuro px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-extrabold text-blanco-cacao">{order.profiles?.full_name}</p>
          <p className="text-xs text-blanco-cacao/50">Pagado el {fecha}</p>
        </div>
        <div className="text-right">
          <p className="text-kuma-dorado font-extrabold">{order.packages?.name}</p>
          <p className="text-xs text-blanco-cacao/50">
            ${order.packages ? Number(order.packages.price).toLocaleString('es-CO') : ''}
          </p>
        </div>
      </div>

      {/* Dirección de despacho */}
      <div className="bg-blanco-cacao px-4 py-3 border-b border-cacao-fresco/10">
        <p className="text-[10px] font-extrabold text-cacao-tostado uppercase tracking-widest mb-1">
          📦 Dirección de despacho
        </p>
        <p className="text-sm font-semibold text-cacao-oscuro">{addr.calle}</p>
        <p className="text-sm text-cacao-tostado">{addr.ciudad}, {addr.departamento}</p>
        <p className="text-sm text-cacao-tostado">📞 {addr.telefono}</p>
      </div>

      {/* Botones de acción */}
      <div className="bg-white px-4 py-3 space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyAddress}
            className="rounded-xl border border-cacao-fresco/30 py-2 text-xs font-bold text-cacao-oscuro hover:bg-blanco-cacao"
          >
            {copied ? '✅ Copiado' : '📋 Copiar dirección'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="rounded-xl bg-[#25D366] py-2 text-xs font-bold text-white hover:opacity-90"
          >
            💬 WhatsApp cliente
          </button>
        </div>

        <button
          onClick={handleDelivered}
          disabled={loading}
          className="w-full rounded-xl bg-verde-natural py-3 font-extrabold text-blanco-cacao hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {loading ? 'Guardando...' : '✅ Marcar como entregado'}
        </button>
      </div>

    </div>
  )
}
