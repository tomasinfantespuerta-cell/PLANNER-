/** Fechas en hora local, como texto 'AAAA-MM-DD' (así no hay líos de husos horarios). */

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // mediodía: a salvo de cambios de hora
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Lunes de la semana de esa fecha. */
export function mondayOf(iso: string): string {
  const d = parseISODate(iso)
  const dow = (d.getDay() + 6) % 7 // lunes = 0
  return addDays(iso, -dow)
}

export function today(): string {
  return toISODate(new Date())
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** "1 – 7 sep", "29 sep – 5 oct", "29 dic 2025 – 4 ene 2026" */
export function formatWeekRange(monday: string): string {
  const a = parseISODate(monday)
  const b = parseISODate(addDays(monday, 6))
  const sameYear = a.getFullYear() === b.getFullYear()
  const yearNow = new Date().getFullYear()
  const left =
    a.getMonth() === b.getMonth() && sameYear
      ? `${a.getDate()}`
      : `${a.getDate()} ${MONTHS[a.getMonth()]}${sameYear ? '' : ` ${a.getFullYear()}`}`
  const right = `${b.getDate()} ${MONTHS[b.getMonth()]}${!sameYear || b.getFullYear() !== yearNow ? ` ${b.getFullYear()}` : ''}`
  return `${left} – ${right}`
}

/** "29 sep" */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[(parseISODate(iso).getDay() + 6) % 7]
}
