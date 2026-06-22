'use client'

import { useState } from 'react'
import { releaseUnconfirmedFounderBadges } from '@/lib/actions/admin'

export function AdminReleaseFoundersButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (
      !confirm(
        '¿Confirmas la APERTURA OFICIAL? Esto liberará para siempre todos los cupos de Fundador apartados que nunca se confirmaron con un pago. Esta acción no se puede deshacer.'
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await releaseUnconfirmedFounderBadges()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-verde-natural/10 border border-verde-natural/30 px-4 py-3 text-sm text-verde-natural font-semibold">
        ✅ Apertura oficial realizada — cupos no confirmados liberados.
      </p>
    )
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
      <p className="text-sm font-bold text-cacao-oscuro">🚪 Apertura oficial del Club de Fundadores</p>
      <p className="text-xs text-cacao-tostado">
        Libera todos los cupos apartados (reservados sin pagar) y deja únicamente los confirmados con pago real.
        Úsalo solo el día que decidas abrir oficialmente.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-cacao-oscuro py-3 font-extrabold text-kuma-dorado hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Liberando...' : 'Hacer apertura oficial'}
      </button>
    </div>
  )
}
