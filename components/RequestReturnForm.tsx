'use client'

import { useState } from 'react'
import { requestReturn } from '@/lib/actions/orders'

export function RequestReturnForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      await requestReturn(orderId, reason)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return <p className="text-sm font-semibold text-kuma-dorado">Devolución solicitada, en revisión</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-kuma-dorado px-3 py-1 text-sm font-semibold text-cacao-oscuro"
      >
        Solicitar devolución
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Cuéntanos el motivo de la devolución"
        className="w-full rounded-lg border border-cacao-tostado/30 p-2 text-sm"
        rows={3}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !reason.trim()}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded-lg bg-cacao-tostado/20 px-3 py-1 text-sm font-semibold text-cacao-oscuro disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
