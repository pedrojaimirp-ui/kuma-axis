import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComingSoon } from '@/components/ComingSoon'
import { ReferralLinkCard } from '@/components/ReferralLinkCard'

const SITE_URL = 'https://kuma-axis.vercel.app'

export default async function RedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Red de Referidos 🌳</h1>
      {profile?.referral_code && (
        <ReferralLinkCard referralLink={`${SITE_URL}/register?ref=${profile.referral_code}`} />
      )}
      <ComingSoon title="Tu árbol de red" emoji="🌳" accentClass="border-cacao-fresco" />
    </div>
  )
}
