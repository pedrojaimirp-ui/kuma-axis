import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComisionesExport } from '@/components/ComisionesExport'

export default async function ComisionesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    redirect('/inicio')
  }

  const { data: comisiones } = await supabase
    .from('wallet_transactions')
    .select('id, created_at, amount, type, description, profiles!wallet_transactions_user_id_fkey(full_name, email, phone)')
    .in('type', ['commission_l1', 'commission_l2', 'commission_l3', 'commission_l4'])
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div className="min-h-screen bg-blanco-cacao p-4">
      <div className="mb-4 flex items-center gap-3">
        <a href="/admin" className="text-sm text-cacao-tostado hover:underline">← Volver al admin</a>
      </div>
      <h1 className="mb-1 text-xl font-bold text-cacao-oscuro">Reporte de comisiones pagadas</h1>
      <p className="mb-4 text-sm text-cacao-tostado">
        Úsalo como soporte contable ante la DIAN. Cada comisión pagada a tu red aparece aquí con nombre, valor y fecha.
      </p>
      <ComisionesExport comisiones={(comisiones ?? []) as never} />
    </div>
  )
}
