import Link from 'next/link'

const BACKGROUNDS: Record<string, string> = {
  kuma1: '/cards/founder-personal.png',
  kuma2: '/cards/founder-pareja.png',
  kuma3: '/cards/founder-familiar.png',
}

export function FounderTeaser({
  packageCode,
  packageLabel,
  remaining,
  cap,
  ctaHref,
  ctaLabel,
}: {
  packageCode: string
  packageLabel: string
  remaining: number
  cap: number
  ctaHref: string
  ctaLabel: string
}) {
  const bg = BACKGROUNDS[packageCode] ?? BACKGROUNDS.kuma1

  return (
    <div className="space-y-2">
      <div className="relative aspect-[700/393] w-full overflow-hidden rounded-2xl shadow-lg">
        <img
          src={bg}
          alt={`Certificado de Fundador Edición ${packageLabel}`}
          className="absolute inset-0 h-full w-full object-cover opacity-35 grayscale"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-cacao-oscuro/30 text-center px-4">
          <span className="text-3xl">🔒</span>
          <p className="text-sm font-extrabold text-blanco-cacao">
            Certificado de Fundador — Edición {packageLabel}
          </p>
          <p className="text-xs text-blanco-cacao/80">
            Quedan {remaining} de {cap} cupos
          </p>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="block w-full rounded-xl bg-kuma-dorado py-3 text-center font-extrabold text-cacao-oscuro hover:opacity-90"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
