import { addDays } from '../lib/dates'
import type { Check, Examen, Fila, Subbloque, Tarea } from './db'
import { diaDeFecha } from './semana'

/* ---------- tareas ---------- */

/**
 * Tareas que salen en «Hoy»: las de hoy y las de días anteriores sin hacer
 * (se pasan solas al día siguiente hasta que las marques).
 */
export function tareasDeHoy(todas: Tarea[], hoy: string): Tarea[] {
  return todas
    .filter((t) => t.fecha !== null && (t.fecha === hoy || (t.fecha < hoy && !t.hecha)))
    .sort((a, b) => Number(a.hecha) - Number(b.hecha) || (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : 0) || a.creada.localeCompare(b.creada))
}

export function pendientes(todas: Tarea[]): Tarea[] {
  return todas.filter((t) => t.fecha === null).sort((a, b) => Number(a.hecha) - Number(b.hecha) || a.creada.localeCompare(b.creada))
}

/* ---------- exámenes y entregas ---------- */

export function diasHasta(fecha: string, hoy: string): number {
  const [y1, m1, d1] = hoy.split('-').map(Number)
  const [y2, m2, d2] = fecha.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export function cuentaAtras(dias: number): string {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias < 0) return `hace ${-dias} días`
  return `en ${dias} días`
}

export function proximosExamenes(todos: Examen[], hoy: string): Examen[] {
  return todos.filter((e) => !e.hecho && e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** ¿Hay un examen en los próximos 7 días? Entonces sugerimos el modo exámenes. */
export function examenCerca(todos: Examen[], hoy: string): Examen | null {
  return proximosExamenes(todos, hoy).find((e) => e.tipo === 'examen' && diasHasta(e.fecha, hoy) <= 7) ?? null
}

/* ---------- subbloques y hábitos ---------- */

export function checkId(subId: string, fecha: string) {
  return `${subId}|${fecha}`
}

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Racha de un hábito: días seguidos (de los que lo tienen en el horario) en los
 * que lo marcaste. Si hoy aún no está hecho, no rompe la racha.
 */
export function racha(texto: string, subbloques: Subbloque[], checks: Set<string>, hoy: string): number {
  const t = norm(texto)
  const porDia = new Map<number, string[]>()
  for (const s of subbloques) {
    if (!s.habito || norm(s.texto) !== t) continue
    const dia = Number(s.bloque.split('-')[0])
    porDia.set(dia, [...(porDia.get(dia) ?? []), s.id])
  }
  if (!porDia.size) return 0
  let n = 0
  let fecha = hoy
  for (let i = 0; i < 400; i++, fecha = addDays(fecha, -1)) {
    const ids = porDia.get(diaDeFecha(fecha))
    if (!ids) continue
    const hecho = ids.some((id) => checks.has(checkId(id, fecha)))
    if (hecho) n++
    else if (fecha !== hoy) break
  }
  return n
}

export function checksSet(checks: Check[]): Set<string> {
  return new Set(checks.map((c) => c.id))
}

/* ---------- dinero (igual que «Cuentas Claras») ---------- */

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function mesKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function mesLabel(key: string): string {
  const [y, m] = key.split('-')
  const name = MESES[parseInt(m, 10) - 1] || ''
  return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y
}

export function moverMes(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  return mesKey(new Date(y, m - 1 + delta, 1))
}

export function parseImporte(str: string): number {
  let cleaned = str.replace(/[^\d,.-]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  else cleaned = cleaned.replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? Math.abs(n) : 0
}

export function fmtImporte(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDinero(n: number): string {
  return (n < 0 ? '-' : '') + fmtImporte(Math.abs(n)) + ' €'
}

export function suma(filas: Fila[]): number {
  return filas.reduce((acc, f) => acc + (typeof f.importe === 'number' ? f.importe : 0), 0)
}

export function esMesActualOFuturo(key: string, hoy = new Date()): boolean {
  return key >= mesKey(hoy)
}
