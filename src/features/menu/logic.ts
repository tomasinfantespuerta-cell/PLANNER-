import { addDays, mondayOf, weekDates } from '../../lib/dates'
import type { Mutation } from '../../sync/types'

/** Menú familiar o menú personal de la pestaña «Yo». */
export type MenuScope = 'familia' | 'yo'

export interface MenuDay {
  /** Clave del día: ver menuDayId(). */
  id: string
  household_id: string
  dish_text: string | null
  recipe_id: string | null
  deleted_at?: string | null
  updated_at?: string | null
}

export interface RecipeRef {
  id: string
  title: string
  deleted_at?: string | null
}

/*
 * Los dos menús viven en la misma tabla. El familiar usa la fecha tal cual
 * ('2026-09-28'); el personal suma 5000 al año ('7026-09-28'). Así cabe en la
 * base de datos existente sin tocarla. Nadie construye estas claves a mano:
 * todo pasa por menuDayId() y parseMenuDayId().
 */
const PERSONAL_YEAR_OFFSET = 5000

export function menuDayId(scope: MenuScope, date: string): string {
  if (scope === 'familia') return date
  const year = Number(date.slice(0, 4)) + PERSONAL_YEAR_OFFSET
  return `${year}${date.slice(4)}`
}

export function parseMenuDayId(id: string): { scope: MenuScope; date: string } {
  const year = Number(id.slice(0, 4))
  if (year >= PERSONAL_YEAR_OFFSET) {
    return { scope: 'yo', date: `${String(year - PERSONAL_YEAR_OFFSET).padStart(4, '0')}${id.slice(4)}` }
  }
  return { scope: 'familia', date: id }
}

/** Días de un menú, indexados por fecha real. */
export function daysByDate(all: MenuDay[], scope: MenuScope): Map<string, MenuDay> {
  const out = new Map<string, MenuDay>()
  for (const d of all) {
    const p = parseMenuDayId(d.id)
    if (p.scope === scope) out.set(p.date, d)
  }
  return out
}

/** Texto a mostrar: el título actual de la receta si está enlazada, si no lo escrito a mano. */
export function dishLabel(day: MenuDay | undefined, recipes: Map<string, RecipeRef>): string | null {
  if (!day || day.deleted_at) return null
  if (day.recipe_id) {
    const r = recipes.get(day.recipe_id)
    if (r && !r.deleted_at) return r.title
  }
  const t = day.dish_text?.trim()
  return t ? t : null
}

export function hasDish(day: MenuDay | undefined): boolean {
  return Boolean(day && !day.deleted_at && (day.dish_text?.trim() || day.recipe_id))
}

/** Cambio para poner (o quitar, con null) el plato de un día. Idempotente: el id sale de la fecha. */
export function planSetDay(
  scope: MenuScope,
  date: string,
  dish: { dish_text: string | null; recipe_id: string | null } | null,
): Mutation {
  return {
    table: 'menu_days',
    id: menuDayId(scope, date),
    op: 'insert',
    patch: {
      dish_text: dish?.dish_text?.trim() || null,
      recipe_id: dish?.recipe_id ?? null,
      deleted_at: null,
    },
  }
}

/**
 * Copia los 7 días de una semana sobre otra. Los días vacíos de origen dejan
 * vacío el destino, así la semana queda exactamente igual que la copiada.
 */
export function planCopyWeek(scope: MenuScope, fromMonday: string, toMonday: string, byDate: Map<string, MenuDay>): Mutation[] {
  return weekDates(fromMonday).map((src, i) => {
    const d = byDate.get(src)
    const target = addDays(toMonday, i)
    return hasDish(d)
      ? planSetDay(scope, target, { dish_text: d!.dish_text, recipe_id: d!.recipe_id })
      : planSetDay(scope, target, null)
  })
}

/** Semanas anteriores a `beforeMonday` que tienen algún plato, de la más reciente a la más antigua. */
export function pastWeeksWithDishes(byDate: Map<string, MenuDay>, beforeMonday: string): Array<{ monday: string; count: number }> {
  const counts = new Map<string, number>()
  for (const [date, d] of byDate) {
    if (!hasDish(d)) continue
    const m = mondayOf(date)
    if (m >= beforeMonday) continue
    counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([monday, count]) => ({ monday, count }))
}
