import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { MembershipCard } from '@/components/MembershipCard'
import { ShareMembershipButton } from '@/components/ShareMembershipButton'
import { getMembershipTier } from '@/lib/membership'

const SITE_URL = 'https://kuma-axis.vercel.app'

export default async function TarjetaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, referral_code, created_at')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  if (!profile?.referral_code) redirect('/red')

  const { data: network, error: networkError } = await supabase.rpc('get_referral_network')

  if (networkError) {
    console.error('get_referral_network failed:', networkError.message)
  }

  const networkRows = (network as { level: number }[] | null) ?? []
  const totalNetwork = networkRows.length
  const directReferrals = networkRows.filter((row) => row.level === 1).length

  const tier = getMembershipTier(directReferrals, totalNetwork)
  const referralLink = `${SITE_URL}/register?ref=${profile.referral_code}`
  const qrDataUrl = await QRCode.toDataURL(referralLink, { margin: 0, width: 200 })

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Mi Tarjeta de Membresía 🎫</h1>

      <MembershipCard
        fullName={profile.full_name}
        tier={tier}
        totalNetwork={totalNetwork}
        referralCode={profile.referral_code}
        memberSince={memberSince}
        qrDataUrl={qrDataUrl}
      />

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
        <p className="text-sm font-bold text-cacao-oscuro">Cómo subir de nivel</p>
        <div className="space-y-1.5 text-sm text-cacao-tostado">
          <p>🥉 Iniciado — recién registrado</p>
          <p>🥈 Embajador — 5 o más referidos directos activos</p>
          <p>🥇 Líder — 15 o más personas en tu red total</p>
          <p>💎 Élite — 50 o más personas en tu red total</p>
        </div>
      </div>

      <ShareMembershipButton tierLabel={tier.label} referralLink={referralLink} />
    </div>
  )
}
