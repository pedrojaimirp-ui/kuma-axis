const SWATCHES = [
  { name: 'cacao-mazorca', className: 'bg-cacao-mazorca' },
  { name: 'kuma-dorado', className: 'bg-kuma-dorado' },
  { name: 'cacao-fresco', className: 'bg-cacao-fresco' },
  { name: 'cacao-tostado', className: 'bg-cacao-tostado' },
  { name: 'cacao-oscuro', className: 'bg-cacao-oscuro' },
  { name: 'verde-natural', className: 'bg-verde-natural' },
  { name: 'blanco-cacao', className: 'bg-blanco-cacao' },
  { name: 'acento-digital', className: 'bg-acento-digital' },
]

export default function Home() {
  return (
    <main className="grid grid-cols-2 gap-2 p-8 sm:grid-cols-4">
      {SWATCHES.map((swatch) => (
        <div key={swatch.name} className="space-y-1">
          <div className={`h-16 rounded-lg border ${swatch.className}`} />
          <p className="text-xs text-cacao-oscuro">{swatch.name}</p>
        </div>
      ))}
    </main>
  )
}
