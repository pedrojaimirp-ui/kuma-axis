export interface MembershipTier {
  code: 'catador' | 'chocolatero' | 'maestro_cacaotero' | 'cacao_de_oro' | 'fundador'
  emoji: string
  label: string
}

const TIERS: MembershipTier[] = [
  { code: 'catador', emoji: '🍫', label: 'Catador KÚMA CACAO AXIS' },
  { code: 'chocolatero', emoji: '🌱', label: 'Chocolatero KÚMA CACAO AXIS' },
  { code: 'maestro_cacaotero', emoji: '🏅', label: 'Maestro Cacaotero KÚMA CACAO AXIS' },
  { code: 'cacao_de_oro', emoji: '🌟', label: 'Cacao de Oro KÚMA CACAO AXIS' },
]

const FUNDADOR_TIER: MembershipTier = {
  code: 'fundador',
  emoji: '👑',
  label: 'Fundador KÚMA CACAO AXIS',
}

export function getMembershipTier(
  directReferrals: number,
  totalNetwork: number,
  role?: string
): MembershipTier {
  if (role === 'owner') return FUNDADOR_TIER
  if (totalNetwork >= 50) return TIERS[3]
  if (totalNetwork >= 15) return TIERS[2]
  if (directReferrals >= 5) return TIERS[1]
  return TIERS[0]
}
