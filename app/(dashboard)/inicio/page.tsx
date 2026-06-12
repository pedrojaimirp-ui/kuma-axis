import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ACCENT_BORDER: Record<string, string> = {
  digital: 'border-acento-digital',
  verde: 'border-verde-natural',
  mazorca: 'border-cacao-mazorca',
}

function SummaryCard({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string
  note: string
  accent: keyof typeof ACCENT_BORDER
}) {
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${ACCENT_BORDER[accent]}`}>
      <p className="text-sm text-cacao-tostado">{label}</p>
      <p className="text-2xl font-bold text-cacao-oscuro">{value}</p>
      <p className="text-xs text-cacao-fresco">{note}</p>
    </div>
  )
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Hola, {firstName} 👋</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Saldo $KCA" value="0.00" note="Disponible próximamente" accent="digital" />
        <SummaryCard label="Referidos activos" value="0" note="Disponible próximamente" accent="verde" />
        <SummaryCard label="Giros disponibles" value="0" note="Disponible próximamente" accent="mazorca" />
      </div>
    </div>
  )
}
