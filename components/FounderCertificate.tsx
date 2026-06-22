const BACKGROUNDS: Record<string, string> = {
  kuma1: '/cards/founder-personal.png',
  kuma2: '/cards/founder-pareja.png',
  kuma3: '/cards/founder-familiar.png',
}

const NUMBER_POSITION: Record<string, { right: string; bottom: string }> = {
  kuma1: { right: '15%', bottom: '8%' },
  kuma2: { right: '15%', bottom: '8%' },
  kuma3: { right: '22%', bottom: '11%' },
}

export function FounderCertificate({
  packageCode,
  founderNumber,
}: {
  packageCode: string
  founderNumber: number
}) {
  const bg = BACKGROUNDS[packageCode] ?? BACKGROUNDS.kuma1
  const pos = NUMBER_POSITION[packageCode] ?? NUMBER_POSITION.kuma1

  return (
    <div className="relative aspect-[700/393] w-full overflow-hidden rounded-2xl shadow-lg">
      <img src={bg} alt="Certificado de Fundador KÚMA CACAO AXIS" className="absolute inset-0 h-full w-full object-cover" />
      <p
        className="absolute text-[clamp(10px,2.6vw,16px)] font-extrabold text-blanco-cacao"
        style={{ right: pos.right, bottom: pos.bottom }}
      >
        {String(founderNumber).padStart(3, '0')}
      </p>
    </div>
  )
}
