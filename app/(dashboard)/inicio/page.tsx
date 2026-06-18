import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function SummaryCard({
  label,
  value,
  note,
  icon,
  bg,
  text,
}: {
  label: string
  value: string
  note: string
  icon: string
  bg: string
  text: string
}) {
  return (
    <div className={`rounded-2xl p-4 shadow-md ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <p className={`text-sm font-semibold ${text}/80`}>{label}</p>
      </div>
      <p className={`text-3xl font-extrabold ${text}`}>{value}</p>
      <p className={`text-xs mt-1 ${text}/60`}>{note}</p>
    </div>
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
        <div className="flex items-center gap-3 rounded-2xl bg-kuma-dorado px-4 py-3 shadow-md">
          <span className="text-3xl">🥇</span>
          <p className="font-extrabold text-cacao-oscuro text-base">{profile.badge}</p>
        </div>
      )}

      {/* Banner principal */}
      <div className="rounded-2xl bg-cacao-oscuro p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 text-8xl opacity-10 select-none">🍫</div>
        <p className="text-kuma-dorado text-xs font-bold uppercase tracking-widest mb-1">KÚMA CACAO AXIS</p>
        <h1 className="text-2xl font-extrabold text-blanco-cacao">¡Hola, {firstName}! 👋</h1>
        <p className="mt-2 text-sm text-blanco-cacao/80 leading-relaxed">
          Bienvenido a la red de chocolate 100% cacao puro de Colombia.
          Gira la ruleta, crece tu red y gana comisiones reales. ✨
        </p>
        <div className="mt-3 inline-block rounded-full bg-kuma-dorado px-3 py-1 text-xs font-bold text-cacao-oscuro">
          🍫 Chocolate sin azúcar · Sin conservantes
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Puntos KÚMA"
          value="—"
          note="Pronto"
          icon="💰"
          bg="bg-kuma-dorado"
          text="text-cacao-oscuro"
        />
        <SummaryCard
          label="Referidos"
          value="—"
          note="Pronto"
          icon="🌳"
          bg="bg-verde-natural"
          text="text-blanco-cacao"
        />
        <SummaryCard
          label="Giros"
          value="—"
          note="Pronto"
          icon="🎰"
          bg="bg-cacao-oscuro"
          text="text-kuma-dorado"
        />
      </div>

      {/* Links rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/tienda" className="rounded-2xl bg-verde-natural p-4 text-center shadow-md hover:opacity-90">
          <p className="text-2xl">🛒</p>
          <p className="mt-1 font-bold text-blanco-cacao text-sm">Comprar</p>
        </a>
        <a href="/red" className="rounded-2xl bg-kuma-dorado p-4 text-center shadow-md hover:opacity-90">
          <p className="text-2xl">🌳</p>
          <p className="mt-1 font-bold text-cacao-oscuro text-sm">Mi Red</p>
        </a>
        <a href="/ruleta" className="rounded-2xl bg-cacao-oscuro p-4 text-center shadow-md hover:opacity-90">
          <p className="text-2xl">🎰</p>
          <p className="mt-1 font-bold text-kuma-dorado text-sm">Ruleta</p>
        </a>
        <a href="/billetera" className="rounded-2xl bg-acento-digital/20 border-2 border-acento-digital p-4 text-center shadow-md hover:opacity-90">
          <p className="text-2xl">💳</p>
          <p className="mt-1 font-bold text-cacao-oscuro text-sm">Billetera</p>
        </a>
      </div>
    </div>
  )
}
