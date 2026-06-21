'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { requestWithdrawal } from '@/lib/actions/wallet'
import { calculateWithdrawalFee, WITHDRAWAL_FEE_PERCENT, RETENCION_FUENTE_PERCENT } from '@/lib/constants'

export function WithdrawalForm({ available }: { available: number }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestWithdrawal({ amount: Number(amount), destination })
      setSuccess(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <p className="rounded-lg bg-verde-natural/10 p-3 text-sm text-verde-natural">
        Tu solicitud de redención fue registrada. Un administrador la revisará pronto.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available <= 0}
        className="w-full rounded-lg bg-verde-natural py-3 text-lg font-bold text-blanco-cacao hover:opacity-90 disabled:opacity-50"
      >
        Canjear Puntos KÚMA
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-blanco-cacao p-3">
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Puntos KÚMA a canjear</label>
        <input
          required
          type="number"
          min="1"
          max={available}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
        {Number(amount) > 0 && (() => {
          const { fee, retencion, net } = calculateWithdrawalFee(Number(amount))
          return (
            <div className="mt-2 space-y-1 rounded-lg bg-blanco-cacao p-3 text-xs text-cacao-tostado">
              <p className="font-semibold text-cacao-oscuro">Liquidación del retiro:</p>
              <p>Valor solicitado: <span className="font-medium">${Number(amount).toLocaleString('es-CO')}</span></p>
              <p>- Retención en la fuente DIAN ({RETENCION_FUENTE_PERCENT}%): <span className="font-medium text-red-500">-${retencion.toLocaleString('es-CO')}</span></p>
              <p className="border-t border-cacao-fresco/30 pt-1 font-bold text-verde-natural">
                Recibirás: ${net.toLocaleString('es-CO')}
              </p>
              <p className="text-[10px] text-cacao-tostado/70">
                La retención en la fuente es un impuesto que KÚMA CACAO AXIS practica y declara ante la DIAN en tu nombre (Art. 392 E.T.).
              </p>
            </div>
          )
        })()}
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">
          Cuenta a la que te transferimos (Nequi, Daviplata, etc.)
        </label>
        <input
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ej: Nequi 3001234567"
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Confirmar solicitud'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-cacao-fresco/40 px-4 py-2 text-cacao-tostado"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
