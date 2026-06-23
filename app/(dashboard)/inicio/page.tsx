import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FounderTeaser } from '@/components/FounderTeaser'
import { FounderCertificate } from '@/components/FounderCertificate'

const PACKAGE_LABELS: Record<string, string> = {
  kuma1: 'Origen',
  kuma2: 'Esencia',
  kuma3: 'Legado',
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  accent,
}: {
  label: string
  value: string
  note: string
  icon: string
  accent: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-cacao-fresco/10">
      <div
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <span>{icon}</span>
      </div>
      <p className="text-xs font-semibold text-cacao-tostado/70">{label}</p>
      <p className="text-2xl font-extrabold text-cacao-oscuro">{value}</p>
      <p className="text-[11px] mt-0.5 text-cacao-tostado/50">{note}</p>
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
  accent,
}: {
  href: string
  icon: string
  label: string
  accent: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-cacao-fresco/10 hover:border-kuma-dorado/40 transition-colors"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <span>{icon}</span>
      </div>
      <p className="font-bold text-cacao-oscuro text-sm">{label}</p>
    </a>
  )
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, badge')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  // ── Club de Fundadores: certificado real, apartado o vista previa ────────
  const { data: founderBadge } = await supabase
    .from('founder_badges')
    .select('package_code, founder_number, confirmed')
    .eq('user_id', user.id)
    .maybeSingle()

  let founderSection: React.ReactNode = null

  if (founderBadge?.confirmed) {
    founderSection = (
      <div className="space-y-2">
        <FounderCertificate
          packageCode={founderBadge.package_code}
          founderNumber={founderBadge.founder_number}
        />
        <a href="/red/tarjeta" className="block text-center text-sm font-semibold text-verde-natural">
          Ver mi tarjeta completa →
        </a>
      </div>
    )
  } else if (founderBadge) {
    founderSection = (
      <div className="space-y-2">
        <FounderCertificate
          packageCode={founderBadge.package_code}
          founderNumber={founderBadge.founder_number}
        />
        <a
          href={`/tienda/comprar/${founderBadge.package_code}`}
          className="block rounded-xl bg-kuma-dorado/15 border border-kuma-dorado/40 p-3 text-center"
        >
          <p className="text-sm font-bold text-cacao-oscuro">
            ⚠️ Tu cupo está apartado, no confirmado todavía
          </p>
          <p className="text-xs text-cacao-tostado mt-0.5">
            Complétalo pagando antes de la apertura oficial o podrías perderlo →
          </p>
        </a>
      </div>
    )
  } else {
    const { data: reservation } = await supabase
      .from('reservations')
      .select('packages(code)')
      .eq('user_id', user.id)
      .maybeSingle()

    const reservedCode = (reservation?.packages as unknown as { code: string } | null)?.code ?? 'kuma1'

    const { data: pkg } = await supabase
      .from('packages')
      .select('founder_cap')
      .eq('code', reservedCode)
      .single()

    const cap = pkg?.founder_cap ?? 0

    const { data: takenRows } = await supabase
      .from('founder_badges')
      .select('user_id, profiles(role)')
      .eq('package_code', reservedCode)

    const taken = (takenRows ?? []).filter((row) => {
      const role = (row.profiles as unknown as { role: string } | null)?.role
      return role !== 'admin' && role !== 'owner'
    }).length

    const remaining = Math.max(cap - taken, 0)

    founderSection = (
      <FounderTeaser
        packageCode={reservedCode}
        packageLabel={PACKAGE_LABELS[reservedCode] ?? 'Origen'}
        remaining={remaining}
        cap={cap}
        ctaHref={reservation ? `/tienda/comprar/${reservedCode}` : '/reservar'}
        ctaLabel={
          reservation
            ? '🔓 Completa tu compra y asegura tu certificado'
            : '🍫 Reserva gratis y entra al Club de Fundadores'
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {profile?.badge && (
        <div className="flex items-center gap-3 rounded-2xl bg-white border border-kuma-dorado/30 px-4 py-3 shadow-sm">
          <span className="text-2xl">🥇</span>
          <p className="font-bold text-cacao-oscuro text-sm">{profile.badge}</p>
        </div>
      )}

      {/* Banner principal */}
      <div className="rounded-2xl bg-cacao-oscuro p-5 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 text-7xl opacity-[0.06] select-none">🍫</div>
        <p className="text-kuma-dorado text-[11px] font-bold uppercase tracking-widest mb-1">KÚMA CACAO AXIS</p>
        <h1 className="text-xl font-extrabold text-blanco-cacao">¡Hola, {firstName}! 👋</h1>
        <p className="mt-2 text-sm text-blanco-cacao/70 leading-relaxed">
          Bienvenido a la red de chocolate 100% cacao puro de Colombia.
          Gira la ruleta, crece tu red y gana comisiones reales.
        </p>
        <div className="mt-3 inline-block rounded-full border border-kuma-dorado/40 px-3 py-1 text-[11px] font-bold text-kuma-dorado">
          🍫 Chocolate sin azúcar · Sin conservantes
        </div>
      </div>

      {/* Club de Fundadores: certificado o vista previa */}
      {founderSection}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Puntos KÚMA" value="—" note="Pronto" icon="💰" accent="#F2B705" />
        <SummaryCard label="Referidos" value="—" note="Pronto" icon="🌳" accent="#2D6A4F" />
        <SummaryCard label="Giros" value="—" note="Pronto" icon="🎰" accent="#3B1A0A" />
      </div>

      {/* Links rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink href="/tienda" icon="🛒" label="Comprar" accent="#2D6A4F" />
        <QuickLink href="/red" icon="🌳" label="Mi Red" accent="#F2B705" />
        <QuickLink href="/ruleta" icon="🎰" label="Ruleta" accent="#3B1A0A" />
        <QuickLink href="/billetera" icon="💳" label="Billetera" accent="#C17817" />
      </div>
    </div>
  )
}
