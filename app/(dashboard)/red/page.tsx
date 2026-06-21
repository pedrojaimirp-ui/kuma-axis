import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReferralLinkCard } from '@/components/ReferralLinkCard'
import { ReferralSlotsGrid } from '@/components/ReferralSlotsGrid'
import { NetworkLevelsCard } from '@/components/NetworkLevelsCard'

const SITE_URL = 'https://kuma-axis.vercel.app'

export default async function RedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('referral_code, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  const unlimited = profile?.role === 'admin' || profile?.role === 'owner'

  let maxDirectReferrals = 0
  if (!unlimited) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('packages(max_direct_referrals)')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orderError) {
      console.error('orders select failed:', orderError.message)
    }

    const pkg = order?.packages as unknown as { max_direct_referrals: number | null } | null
    maxDirectReferrals = pkg?.max_direct_referrals ?? 0
  }

  const { data: network, error: networkError } = await supabase.rpc('get_referral_network')

  if (networkError) {
    console.error('get_referral_network failed:', networkError.message)
  }

  const networkRows = (network as { level: number; id: string; full_name: string }[] | null) ?? []
  const directReferrals = networkRows.filter((row) => row.level === 1)
  const levelCounts = networkRows.reduce<Record<number, number>>((acc, row) => {
    acc[row.level] = (acc[row.level] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Red de Referidos 🌳</h1>
      {profile?.referral_code && (
        <ReferralLinkCard referralLink={`${SITE_URL}/register?ref=${profile.referral_code}`} />
      )}
      <ReferralSlotsGrid
        totalSlots={maxDirectReferrals}
        referrals={directReferrals.map(({ id, full_name }) => ({ id, full_name }))}
        unlimited={unlimited}
      />
      <NetworkLevelsCard counts={levelCounts} />
      <a
        href="/red/tarjeta"
        className="block rounded-xl bg-cacao-oscuro p-4 text-center hover:opacity-90"
      >
        <p className="text-sm font-bold text-kuma-dorado">🎫 Ver mi tarjeta de membresía</p>
        <p className="mt-1 text-xs text-blanco-cacao/60">Tu nivel, tu red y tu código QR</p>
      </a>
      <a
        href="/plan-compensacion"
        target="_blank"
        className="block rounded-xl bg-kuma-dorado/15 border border-kuma-dorado/30 p-4 text-center hover:bg-kuma-dorado/20"
      >
        <p className="text-sm font-bold text-cacao-oscuro">📊 Ver plan de compensación completo</p>
        <p className="mt-1 text-xs text-cacao-tostado">Cuánto se gana por nivel en cada paquete</p>
      </a>
    </div>
  )
}
