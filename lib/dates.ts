// Cuenta los días hábiles (lunes a viernes) entre dos fechas, sin contar el
// día inicial. Espejo en TypeScript de la función SQL business_days_between,
// usado para mostrar "te quedan N días" en la interfaz.
export function businessDaysBetween(from: Date, to: Date): number {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))

  let count = 0
  const day = new Date(start)
  while (day < end) {
    day.setUTCDate(day.getUTCDate() + 1)
    const dow = day.getUTCDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}
