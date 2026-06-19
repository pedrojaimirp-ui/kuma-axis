import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
