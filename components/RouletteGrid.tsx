import { ROULETTE_PRIZES } from '@/lib/constants'

export function RouletteGrid({ landedIndex }: { landedIndex: number | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ROULETTE_PRIZES.map((prize, i) => (
        <div
          key={prize.match}
          className={`rounded-lg border-2 p-3 text-center text-sm font-semibold transition-colors ${
            landedIndex === i
              ? 'border-kuma-dorado bg-kuma-dorado/20 text-cacao-oscuro'
              : 'border-cacao-fresco/20 text-cacao-tostado'
          }`}
        >
          {prize.display}
        </div>
      ))}
    </div>
  )
}
