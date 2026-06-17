import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReservaForm } from '@/components/ReservaForm'
import type { Package } from '@/lib/types'

export default async function ReservarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/inicio')

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-kuma-dorado/20 border border-kuma-dorado p-4 text-center">
        <p className="text-2xl">🍫</p>
        <h1 className="text-xl font-bold text-cacao-oscuro">¡Bienvenido a KÚMA CACAO AXIS!</h1>
        <p className="mt-1 text-sm text-cacao-tostado">
          Aparta el paquete que quieres comprar el día de apertura. <strong>Es gratis y no te compromete a nada.</strong>
        </p>
      </div>
      <ReservaForm packages={(packages as Package[]) ?? []} />
    </div>
  )
}
