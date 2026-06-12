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
  status: OrderStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminOrder {
  id: string
  created_at: string
  shipping_address: ShippingAddress
  profiles: { full_name: string; phone: string } | null
  packages: { name: string; price: number } | null
}
