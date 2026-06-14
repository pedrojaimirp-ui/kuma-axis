import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RewardCatalog } from '@/components/RewardCatalog'
import type { Wallet } from '@/lib/types'

export default async function CanjearPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('wallets select failed:', error.message)
  }

  const points = (wallet as Wallet | null)?.loyalty_points_balance ?? 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Catálogo de premios 🎁</h1>
      <RewardCatalog points={points} />
    </div>
  )
}
