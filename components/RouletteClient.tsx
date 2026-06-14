'use client'

import { useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { spinRoulette } from '@/lib/actions/roulette'
import { ROULETTE_PRIZES } from '@/lib/constants'
import { RouletteWheel } from './RouletteWheel'
import { getAudioContext, playTick, playWin, playAgain } from '@/lib/sound'
import type { SpinHistoryEntry } from '@/lib/types'

const BRAND_CONFETTI_COLORS = ['#C9A84C', '#5A3A22', '#7A9A3D']
const SEGMENT_ANGLE = 360 / ROULETTE_PRIZES.length
const SPIN_DURATION_MS = 3000
const EXTRA_SPINS = 4
const TICK_INTERVAL_MS = 120

export function RouletteClient({
  initialSpins,
  initialHistory,
}: {
  initialSpins: number
  initialHistory: SpinHistoryEntry[]
}) {
  const [spinsAvailable, setSpinsAvailable] = useState(initialSpins)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  function getAudio() {
    if (!audioCtxRef.current) audioCtxRef.current = getAudioContext()
    return audioCtxRef.current
  }

  async function handleSpin() {
    if (spinsAvailable <= 0 || spinning) return
    setSpinning(true)
    setResultMessage(null)

    const audio = getAudio()
    if (audio) {
      tickIntervalRef.current = setInterval(() => playTick(audio), TICK_INTERVAL_MS)
    }

    let result: { prize_label: string; prize_amount: number }
    try {
      result = await spinRoulette()
    } catch (err) {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
      setSpinning(false)
      setResultMessage(err instanceof Error ? err.message : 'No se pudo girar la ruleta.')
      return
    }

    const finalIndex = ROULETTE_PRIZES.findIndex((p) => p.match === result.prize_label)
    const segmentCenter = finalIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    const targetMod = (360 - segmentCenter + 360) % 360
    setRotation((prev) => {
      const base = prev - (prev % 360)
      let next = base + EXTRA_SPINS * 360 + targetMod
      if (next <= prev) next += 360
      return next
    })

    await new Promise((resolve) => setTimeout(resolve, SPIN_DURATION_MS))

    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)

    if (result.prize_amount > 0) {
      if (audio) playWin(audio)
      confetti({ colors: BRAND_CONFETTI_COLORS, particleCount: 150, spread: 100, startVelocity: 45 })
      setResultMessage(
        `¡Ganaste un premio de fidelización! +${result.prize_amount.toLocaleString('es-CO')} puntos de fidelización 🍫🎉`
      )
      setSpinsAvailable((n) => n - 1)
    } else {
      if (audio) playAgain(audio)
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
          <RouletteWheel rotation={rotation} />
        </div>

        <button
          onClick={handleSpin}
          disabled={spinsAvailable <= 0 || spinning}
          className="mt-4 w-full rounded-lg bg-kuma-dorado py-3 font-bold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {spinning ? 'Girando...' : '¡Girar la Ruleta de Premios! 🍫'}
        </button>

        {resultMessage && (
          <p className="mt-3 text-center text-lg font-semibold text-cacao-oscuro">{resultMessage}</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-cacao-oscuro">Tus últimos premios de fidelización</h2>
        {!history.length && <p className="text-cacao-tostado">Todavía no has girado la ruleta.</p>}
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between border-b border-cacao-fresco/10 pb-2 text-sm">
              <p className="text-cacao-oscuro">
                {h.prize_amount > 0 ? `🍫 +${h.prize_amount.toLocaleString('es-CO')} pts` : '🍫 Otra vez'}
              </p>
              <p className="text-cacao-tostado">{new Date(h.created_at).toLocaleDateString('es-CO')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
