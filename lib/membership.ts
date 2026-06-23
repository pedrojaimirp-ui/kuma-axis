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

export interface FounderBadgeStyle {
  borderColor: string
  emoji: string
  packageLabel: string
}

const FOUNDER_STYLES: Record<string, FounderBadgeStyle> = {
  kuma1: { borderColor: '#C17817', emoji: '🍫', packageLabel: 'Origen' },
  kuma2: { borderColor: '#C9C9C9', emoji: '🍫🍫', packageLabel: 'Esencia' },
  kuma3: { borderColor: '#F2B705', emoji: '🍫🍫🍫', packageLabel: 'Legado' },
}

export function getFounderBadgeStyle(packageCode: string): FounderBadgeStyle {
  return FOUNDER_STYLES[packageCode] ?? FOUNDER_STYLES.kuma1
}
