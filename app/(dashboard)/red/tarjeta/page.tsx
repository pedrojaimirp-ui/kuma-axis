import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { MembershipCard } from '@/components/MembershipCard'
import { FounderCertificate } from '@/components/FounderCertificate'
import { ShareMembershipButton } from '@/components/ShareMembershipButton'
import { getMembershipTier, getFounderBadgeStyle } from '@/lib/membership'

const SITE_URL = 'https://kuma-axis.vercel.app'

export default async function TarjetaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, referral_code, created_at, role')
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

  const tier = getMembershipTier(directReferrals, totalNetwork, profile.role)
  const referralLink = `${SITE_URL}/register?ref=${profile.referral_code}`
  const qrDataUrl = await QRCode.toDataURL(referralLink, { margin: 0, width: 200 })

  const { data: founderBadge, error: founderError } = await supabase
    .from('founder_badges')
    .select('package_code, founder_number')
    .eq('user_id', user.id)
    .maybeSingle()

  if (founderError) {
    console.error('founder_badges select failed:', founderError.message)
  }

  let founder: { number: number; cap: number; style: ReturnType<typeof getFounderBadgeStyle> } | undefined
  if (founderBadge) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('founder_cap')
      .eq('code', founderBadge.package_code)
      .single()

    founder = {
      number: founderBadge.founder_number,
      cap: pkg?.founder_cap ?? 0,
      style: getFounderBadgeStyle(founderBadge.package_code),
    }
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Mi Tarjeta de Membresía 🎫</h1>

      {founderBadge && (
        <FounderCertificate
          packageCode={founderBadge.package_code}
          founderNumber={founderBadge.founder_number}
        />
      )}

      <MembershipCard
        fullName={profile.full_name}
        tier={tier}
        totalNetwork={totalNetwork}
        referralCode={profile.referral_code}
        memberSince={memberSince}
        qrDataUrl={qrDataUrl}
        founder={founder}
      />

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
        <p className="text-sm font-bold text-cacao-oscuro">Cómo subir de nivel</p>
        <div className="space-y-1.5 text-sm text-cacao-tostado">
          <p>🍫 Catador — recién registrado</p>
          <p>🌱 Chocolatero — 5 o más referidos directos activos</p>
          <p>🏅 Maestro Cacaotero — 15 o más personas en tu red total</p>
          <p>🌟 Cacao de Oro — 50 o más personas en tu red total</p>
          <p>👑 Fundador — cuenta de dueño de KÚMA CACAO AXIS</p>
        </div>
      </div>

      <ShareMembershipButton tierLabel={tier.label} referralLink={referralLink} />
    </div>
  )
}
