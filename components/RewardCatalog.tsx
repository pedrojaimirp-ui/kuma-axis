'use client'

import { useState } from 'react'
import { redeemReward } from '@/lib/actions/rewards'
import { REWARD_CATALOG, type RewardCode } from '@/lib/constants'

export function RewardCatalog({ points }: { points: number }) {
  const [loadingCode, setLoadingCode] = useState<RewardCode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRedeem(code: RewardCode) {
    setLoadingCode(code)
    setError(null)
    setMessage(null)
    try {
      await redeemReward(code)
      setMessage('¡Premio canjeado! Revisa tu billetera.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo canjear el premio.')
    } finally {
      setLoadingCode(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-white p-4 text-cacao-tostado shadow-sm">
        Tienes <span className="font-bold text-verde-natural">{points.toLocaleString('es-CO')} puntos</span> de
        fidelización.
      </p>

      {message && (
        <p className="rounded-lg bg-verde-natural/10 p-3 text-sm text-verde-natural">{message}</p>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {REWARD_CATALOG.map((item) => {
          const canRedeem = points >= item.pointsCost
          return (
            <div key={item.code} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold text-cacao-oscuro">{item.label}</p>
                <p className="text-sm text-cacao-tostado">{item.description}</p>
                <p className="text-sm text-cacao-tostado">{item.pointsCost.toLocaleString('es-CO')} puntos</p>
              </div>
              <button
                onClick={() => handleRedeem(item.code)}
                disabled={!canRedeem || loadingCode !== null}
                className="shrink-0 rounded-lg bg-verde-natural px-3 py-2 text-sm font-semibold text-blanco-cacao hover:opacity-90 disabled:opacity-40"
              >
                {loadingCode === item.code
                  ? 'Canjeando...'
                  : canRedeem
                    ? 'Canjear'
                    : `Te faltan ${(item.pointsCost - points).toLocaleString('es-CO')} pts`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
