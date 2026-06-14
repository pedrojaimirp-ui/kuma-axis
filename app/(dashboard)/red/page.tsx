import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReferralLinkCard } from '@/components/ReferralLinkCard'
import { ReferralSlotsGrid } from '@/components/ReferralSlotsGrid'

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

  const { data: referrals, error: referralsError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('referred_by', user.id)
    .order('created_at', { ascending: true })

  if (referralsError) {
    console.error('referrals select failed:', referralsError.message)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Red de Referidos 🌳</h1>
      {profile?.referral_code && (
        <ReferralLinkCard referralLink={`${SITE_URL}/register?ref=${profile.referral_code}`} />
      )}
      <ReferralSlotsGrid
        totalSlots={maxDirectReferrals}
        referrals={(referrals as { id: string; full_name: string }[] | null) ?? []}
        unlimited={unlimited}
      />
    </div>
  )
}
