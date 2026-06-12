export function isValidColombianPhone(phone: string): boolean {
  return /^3\d{9}$/.test(phone)
}

export function toSyntheticEmail(phone: string): string {
  return `${phone}@kumaaxis.app`
}
