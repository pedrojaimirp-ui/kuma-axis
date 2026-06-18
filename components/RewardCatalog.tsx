'use client'

import { useState } from 'react'
import { redeemReward } from '@/lib/actions/rewards'
import { REWARD_CATALOG, type RewardCode, type RewardCatalogItem } from '@/lib/constants'

const TIER_CONFIG = {
  1: { label: 'Nivel Fácil', color: 'from-cacao-tostado to-[#8B6914]', badge: 'bg-kuma-dorado/20 text-kuma-dorado border-kuma-dorado/30', icon: '⭐' },
  2: { label: 'Nivel Medio', color: 'from-verde-natural to-[#1a4f35]', badge: 'bg-verde-natural/20 text-verde-natural border-verde-natural/30', icon: '⭐⭐' },
  3: { label: 'Nivel Premium', color: 'from-[#7B2D8B] to-[#4A1060]', badge: 'bg-purple-100 text-purple-700 border-purple-300', icon: '⭐⭐⭐' },
  4: { label: 'Nivel Exclusivo', color: 'from-[#B8860B] to-[#8B6914]', badge: 'bg-amber-100 text-amber-700 border-amber-300', icon: '👑' },
} as const

function RewardCard({
  item,
  points,
  loadingCode,
  onRedeem,
}: {
  item: RewardCatalogItem
  points: number
  loadingCode: RewardCode | null
  onRedeem: (code: RewardCode) => void
}) {
  const canRedeem = points >= item.pointsCost
  const isLoading = loadingCode === item.code
  const lacking = item.pointsCost - points
  const pct = Math.min(100, Math.round((points / item.pointsCost) * 100))

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-md border ${
        canRedeem ? 'border-kuma-dorado/40' : 'border-cacao-fresco/10'
      } transition-all`}
    >
      <div className="bg-cacao-oscuro px-4 pt-3 pb-2 flex items-start gap-3">
        <span className="text-3xl leading-none mt-1">{item.emoji}</span>
        <div className="flex-1">
          <p className="font-extrabold text-blanco-cacao leading-tight">{item.label}</p>
          <p className="text-xs text-blanco-cacao/60 mt-0.5">{item.description}</p>
        </div>
      </div>

      <div className="bg-white px-4 py-3 space-y-3">
        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-cacao-tostado font-semibold">
              {item.pointsCost.toLocaleString('es-CO')} puntos
            </span>
            <span className={canRedeem ? 'text-verde-natural font-bold' : 'text-cacao-tostado/60'}>
              {canRedeem ? '¡Listo para canjear!' : `${pct}% completado`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-blanco-cacao overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${canRedeem ? 'bg-verde-natural' : 'bg-kuma-dorado'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => onRedeem(item.code)}
          disabled={!canRedeem || loadingCode !== null}
          className={`w-full rounded-xl py-3 font-extrabold text-sm transition-all ${
            canRedeem
              ? 'bg-kuma-dorado text-cacao-oscuro hover:opacity-90 shadow-sm'
              : 'bg-blanco-cacao text-cacao-tostado/50 cursor-not-allowed'
          }`}
        >
          {isLoading
            ? '⏳ Canjeando...'
            : canRedeem
              ? '🎁 Canjear ahora'
              : `Faltan ${lacking.toLocaleString('es-CO')} puntos`}
        </button>
      </div>
    </div>
  )
}

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
      setMessage('¡Premio canjeado con éxito! Revisa tu billetera.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo canjear el premio.')
    } finally {
      setLoadingCode(null)
    }
  }

  const tiers = ([1, 2, 3, 4] as const).map((tier) => ({
    tier,
    ...TIER_CONFIG[tier],
    items: REWARD_CATALOG.filter((r) => r.tier === tier),
  }))

  return (
    <div className="space-y-4">
      {/* Encabezado de puntos */}
      <div className="rounded-2xl overflow-hidden shadow-md">
        <div className="bg-verde-natural px-5 py-4">
          <p className="text-xs font-bold text-blanco-cacao/70 uppercase tracking-wide">Tus Puntos KÚMA</p>
          <p className="text-5xl font-extrabold text-kuma-dorado">
            {points.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-blanco-cacao/60 mt-1">
            Gira la Ruleta KÚMA cada día para acumular más puntos
          </p>
        </div>
        <div className="bg-white px-5 py-3">
          <p className="text-xs text-cacao-tostado">
            💡 Canjea tus puntos por chocolate, descuentos, merchandising y experiencias exclusivas KÚMA.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-verde-natural/10 border border-verde-natural/30 p-4 text-sm text-verde-natural font-semibold">
          ✅ {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Secciones por nivel */}
      {tiers.map(({ tier, label, color, badge, icon, items }) => (
        <div key={tier}>
          {/* Encabezado del nivel */}
          <div className={`rounded-xl bg-gradient-to-r ${color} px-4 py-3 flex items-center gap-2 mb-3`}>
            <span className="text-lg">{icon}</span>
            <div>
              <p className="font-extrabold text-white text-sm">{label}</p>
              <p className="text-white/70 text-xs">
                {tier === 1 && 'Para empezar — fácil de alcanzar'}
                {tier === 2 && 'Productos reales — chocolate en tu puerta'}
                {tier === 3 && 'Grandes recompensas — ¡mucho más!'}
                {tier === 4 && 'Lo más exclusivo que existe en KÚMA'}
              </p>
            </div>
            <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-bold ${badge}`}>
              Nivel {tier}
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <RewardCard
                key={item.code}
                item={item}
                points={points}
                loadingCode={loadingCode}
                onRedeem={handleRedeem}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
