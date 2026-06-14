'use client'

import { useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { spinRoulette } from '@/lib/actions/roulette'
import { ROULETTE_PRIZES } from '@/lib/constants'
import { RouletteGrid } from './RouletteGrid'
import type { SpinHistoryEntry } from '@/lib/types'

const BRAND_CONFETTI_COLORS = ['#C9A84C', '#5A3A22', '#7A9A3D']
const MIN_SPIN_DURATION_MS = 1500

export function RouletteClient({
  initialSpins,
  initialHistory,
}: {
  initialSpins: number
  initialHistory: SpinHistoryEntry[]
}) {
  const [spinsAvailable, setSpinsAvailable] = useState(initialSpins)
  const [landedIndex, setLandedIndex] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleSpin() {
    if (spinsAvailable <= 0 || spinning) return
    setSpinning(true)
    setResultMessage(null)

    const start = Date.now()
    const spinPromise = spinRoulette()

    let index = landedIndex ?? 0
    intervalRef.current = setInterval(() => {
      index = (index + 1) % ROULETTE_PRIZES.length
      setLandedIndex(index)
    }, 80)

    let result: { prize_label: string; prize_amount: number }
    try {
      result = await spinPromise
    } catch (err) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setSpinning(false)
      setResultMessage(err instanceof Error ? err.message : 'No se pudo girar la ruleta.')
      return
    }

    const elapsed = Date.now() - start
    if (elapsed < MIN_SPIN_DURATION_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_DURATION_MS - elapsed))
    }

    if (intervalRef.current) clearInterval(intervalRef.current)

    const finalIndex = ROULETTE_PRIZES.findIndex((p) => p.match === result.prize_label)
    setLandedIndex(finalIndex >= 0 ? finalIndex : null)

    if (result.prize_amount > 0) {
      confetti({ colors: BRAND_CONFETTI_COLORS })
      setResultMessage(
        `¡Endulzaste tu billetera! Ganaste $${result.prize_amount.toLocaleString('es-CO')} 🍫🎉`
      )
      setSpinsAvailable((n) => n - 1)
    } else {
      setResultMessage('🍫 Casi... ¡prueba otra vez!')
    }

    setHistory((h) =>
      [
        {
          id: crypto.randomUUID(),
          prize_label: result.prize_label,
          prize_amount: result.prize_amount,
          created_at: new Date().toISOString(),
        },
        ...h,
      ].slice(0, 5)
    )

    setSpinning(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-cacao-tostado">
          Tienes <span className="font-bold text-cacao-oscuro">{spinsAvailable}</span> giro
          {spinsAvailable === 1 ? '' : 's'} disponible{spinsAvailable === 1 ? '' : 's'}
        </p>

        <div className="mt-3">
          <RouletteGrid landedIndex={landedIndex} />
        </div>

        <button
          onClick={handleSpin}
          disabled={spinsAvailable <= 0 || spinning}
          className="mt-4 w-full rounded-lg bg-kuma-dorado py-3 font-bold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {spinning ? 'Girando...' : '¡Girar la Ruleta de Cacao! 🍫'}
        </button>

        {resultMessage && (
          <p className="mt-3 text-center text-lg font-semibold text-cacao-oscuro">{resultMessage}</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-cacao-oscuro">Tus últimos premios</h2>
        {!history.length && <p className="text-cacao-tostado">Todavía no has girado la ruleta.</p>}
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between border-b border-cacao-fresco/10 pb-2 text-sm">
              <p className="text-cacao-oscuro">
                {h.prize_amount > 0 ? `🍫 $${h.prize_amount.toLocaleString('es-CO')}` : '🍫 Otra vez'}
              </p>
              <p className="text-cacao-tostado">{new Date(h.created_at).toLocaleDateString('es-CO')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
