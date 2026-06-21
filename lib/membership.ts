export interface MembershipTier {
  code: 'iniciado' | 'embajador' | 'lider' | 'elite'
  emoji: string
  label: string
}

const TIERS: MembershipTier[] = [
  { code: 'iniciado', emoji: '🥉', label: 'Iniciado KÚMA CACAO AXIS' },
  { code: 'embajador', emoji: '🥈', label: 'Embajador KÚMA CACAO AXIS' },
  { code: 'lider', emoji: '🥇', label: 'Líder KÚMA CACAO AXIS' },
  { code: 'elite', emoji: '💎', label: 'Élite KÚMA CACAO AXIS' },
]

export function getMembershipTier(directReferrals: number, totalNetwork: number): MembershipTier {
  if (totalNetwork >= 50) return TIERS[3]
  if (totalNetwork >= 15) return TIERS[2]
  if (directReferrals >= 5) return TIERS[1]
  return TIERS[0]
}
