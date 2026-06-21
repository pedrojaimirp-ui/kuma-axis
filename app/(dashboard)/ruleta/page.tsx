import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { claimDailySpins } from '@/lib/actions/roulette'
import { RouletteClient } from '@/components/RouletteClient'
import type { SpinHistoryEntry } from '@/lib/types'

export default async function RuletaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  const isStaff = !!profile && ['admin', 'owner'].includes(profile.role)

  const credits = await claimDailySpins()

  const { data: history, error: historyError } = await supabase
    .from('spin_history')
    .select('id, prize_label, prize_amount, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (historyError) {
    console.error('spin_history select failed:', historyError.message)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Ruleta de Premios 🍫</h1>
      <RouletteClient
        initialSpins={credits.daily_spins_remaining + credits.referral_spins_balance}
        initialHistory={(history as SpinHistoryEntry[] | null) ?? []}
        unlimited={isStaff}
      />
    </div>
  )
}
