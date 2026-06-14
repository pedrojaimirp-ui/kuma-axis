const LEVEL_LABELS: Record<number, string> = {
  1: 'Nivel 1 (directos)',
  2: 'Nivel 2',
  3: 'Nivel 3',
  4: 'Nivel 4',
}

export function NetworkLevelsCard({ counts }: { counts: Record<number, number> }) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-cacao-oscuro">Tu red por niveles</h2>
      <p className="mt-1 text-sm text-cacao-tostado">
        Cada nivel representa una linea de profundidad: tus invitados directos (nivel 1),
        los invitados de tus invitados (nivel 2), y asi sucesivamente.
      </p>

      <div className="mt-3 space-y-2">
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className="flex items-center justify-between rounded-lg bg-blanco-cacao p-2">
            <span className="text-sm font-semibold text-cacao-oscuro">{LEVEL_LABELS[level]}</span>
            <span className="text-sm font-bold text-verde-natural">{counts[level] ?? 0} personas</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm font-semibold text-cacao-oscuro">Total en tu red: {total} personas</p>
    </div>
  )
}
