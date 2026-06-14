export type PackageCode = 'kuma1' | 'kuma2' | 'kuma3'

export interface ActivationRequirement {
  min_direct_referrals: number
}

export interface Package {
  id: string
  code: PackageCode
  name: string
  price: number
  bags: number
  commissions_json: Record<string, number>
  daily_spins: number
  referral_spins: number
  activation_requirement: ActivationRequirement | null
}

export type ProfileRole = 'user' | 'admin' | 'owner'

export interface Profile {
  id: string
  full_name: string
  phone: string
  referral_code: string
  referred_by: string | null
  role: ProfileRole
  terms_accepted_at: string | null
  created_at: string
}

export type OrderStatus = 'pending_payment' | 'paid' | 'rejected'

export interface ShippingAddress {
  calle: string
  ciudad: string
  departamento: string
  telefono: string
}

export interface Order {
  id: string
  user_id: string
  package_id: string
  shipping_address: ShippingAddress
  auto_renew: boolean
  payment_reference: string | null
  status: OrderStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminOrder {
  id: string
  created_at: string
  shipping_address: ShippingAddress
  payment_reference: string | null
  profiles: { full_name: string; phone: string } | null
  packages: { name: string; price: number } | null
}

export interface Wallet {
  user_id: string
  balance_available: number
  balance_locked: number
  updated_at: string
}

export type WalletTransactionType =
  | 'commission_l1'
  | 'commission_l2'
  | 'commission_l3'
  | 'commission_l4'
  | 'owner_global'
  | 'unlock'
  | 'purchase_with_balance'
  | 'withdrawal_request'
  | 'withdrawal_rejected'
  | 'roulette_prize'

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  type: WalletTransactionType
  bucket: 'available' | 'locked'
  related_order_id: string | null
  related_withdrawal_id: string | null
  description: string
  created_at: string
}

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected'

export interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  fee_amount: number
  net_amount: number
  destination: string
  status: WithdrawalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminWithdrawal {
  id: string
  amount: number
  fee_amount: number
  net_amount: number
  destination: string
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

export interface SpinCredits {
  daily_spins_remaining: number
  referral_spins_balance: number
}

export interface SpinHistoryEntry {
  id: string
  prize_label: string
  prize_amount: number
  created_at: string
}
