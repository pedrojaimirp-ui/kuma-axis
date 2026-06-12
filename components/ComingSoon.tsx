export function ComingSoon({
  title,
  emoji,
  accentClass,
}: {
  title: string
  emoji: string
  accentClass: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center ${accentClass}`}>
      <span className="text-4xl">{emoji}</span>
      <h2 className="mt-2 text-lg font-bold text-cacao-oscuro">{title}</h2>
      <p className="mt-1 text-cacao-tostado">Próximamente 🍫</p>
    </div>
  )
}
