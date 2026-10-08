import { CATEGORIES, DEFAULT_CATEGORY } from '../../lib/categories'
import { capitalize, newId, normalizeName } from '../../lib/text'
import { comparePositioned, computeMove, keyAfterLast } from '../../sync/order'
import type { Mutation } from '../../sync/types'

export interface ShoppingItem {
  id: string
  household_id: string
  name: string
  name_norm: string
  quantity: string | null
  category: string
  checked: boolean
  checked_at: string | null
  position: string
  updated_at?: string | null
  deleted_at?: string | null
}

/** Lista familiar (la de siempre) o lista personal de la pestaña «Yo». */
export type ListId = 'familia' | 'yo'

/*
 * La lista personal se guarda en la misma tabla, marcando la categoría con
 * "yo|" (p. ej. "yo|despensa"). Así no hubo que cambiar la base de datos.
 * Todo el código pasa por estas tres funciones; nadie lee `category` a pelo.
 */
const PERSONAL_PREFIX = 'yo|'

export function listOf(item: Pick<ShoppingItem, 'category'>): ListId {
  return item.category?.startsWith(PERSONAL_PREFIX) ? 'yo' : 'familia'
}

export function categoryOf(item: Pick<ShoppingItem, 'category'>): string {
  const c = item.category ?? ''
  return c.startsWith(PERSONAL_PREFIX) ? c.slice(PERSONAL_PREFIX.length) : c
}

export function encodeCategory(list: ListId, category: string | null | undefined): string {
  const c = category || DEFAULT_CATEGORY
  return list === 'yo' ? PERSONAL_PREFIX + c : c
}

export interface ShoppingView {
  pending: ShoppingItem[]
  done: ShoppingItem[]
}

/**
 * Orden en pantalla:
 *  - pendientes, por su posición guardada;
 *  - tachados al final, en el orden en que se tacharon.
 * Destachar un producto lo devuelve a su sitio original.
 */
export function buildView(all: ShoppingItem[], list: ListId = 'familia'): ShoppingView {
  const alive = all.filter((i) => !i.deleted_at && listOf(i) === list)
  const pending = alive.filter((i) => !i.checked).sort(comparePositioned)
  const done = alive
    .filter((i) => i.checked)
    .sort((a, b) => (a.checked_at ?? '').localeCompare(b.checked_at ?? '') || comparePositioned(a, b))
  return { pending, done }
}

export function groupByCategory(items: ShoppingItem[]): Array<{ category: string; items: ShoppingItem[] }> {
  const known = new Set(CATEGORIES.map((c) => c.id))
  const catOf = (i: ShoppingItem) => (known.has(categoryOf(i)) ? categoryOf(i) : DEFAULT_CATEGORY)
  return CATEGORIES.map((c) => ({ category: c.id, items: items.filter((i) => catOf(i) === c.id) })).filter(
    (g) => g.items.length > 0,
  )
}

export interface NewItemInput {
  name: string
  quantity?: string | null
  category?: string | null
}

export function makeItem(
  input: NewItemInput,
  all: ShoppingItem[],
  householdId: string,
  list: ListId = 'familia',
  position?: string,
): ShoppingItem {
  const name = capitalize(input.name)
  return {
    id: newId(),
    household_id: householdId,
    name,
    name_norm: normalizeName(name),
    quantity: input.quantity?.trim() || null,
    category: encodeCategory(list, input.category),
    checked: false,
    checked_at: null,
    position: position ?? keyAfterLast(all),
    deleted_at: null,
  }
}

/**
 * Cambios para añadir varios productos (p. ej. ingredientes de una receta) sin
 * duplicar lo que ya está apuntado:
 *  - si ya está pendiente, no se toca;
 *  - si estaba tachado (ya comprado), se vuelve a poner pendiente;
 *  - si no está, se añade al final.
 */
export function planAddMany(
  inputs: NewItemInput[],
  all: ShoppingItem[],
  householdId: string,
  list: ListId = 'familia',
): { mutations: Mutation[]; added: string[]; skipped: string[]; reactivated: string[] } {
  const alive = all.filter((i) => !i.deleted_at && listOf(i) === list)
  const byNorm = new Map<string, ShoppingItem>()
  for (const i of alive) {
    const prev = byNorm.get(i.name_norm)
    if (!prev || (prev.checked && !i.checked)) byNorm.set(i.name_norm, i)
  }
  const mutations: Mutation[] = []
  const added: string[] = []
  const skipped: string[] = []
  const reactivated: string[] = []
  const seen = new Set<string>()
  const working = [...all]

  for (const input of inputs) {
    const norm = normalizeName(input.name)
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    const existing = byNorm.get(norm)
    if (existing && !existing.checked) {
      skipped.push(existing.name)
    } else if (existing && existing.checked) {
      mutations.push({ table: 'shopping_items', id: existing.id, op: 'update', patch: { checked: false, checked_at: null } })
      reactivated.push(existing.name)
    } else {
      const item = makeItem(input, working, householdId, list)
      working.push(item)
      mutations.push({ table: 'shopping_items', id: item.id, op: 'insert', patch: { ...item } })
      added.push(item.name)
    }
  }
  return { mutations, added, skipped, reactivated }
}

/** Cambios de posición al arrastrar dentro de una lista visible. */
export function planMove(list: ShoppingItem[], fromIndex: number, toIndex: number): Mutation[] {
  return computeMove(list, fromIndex, toIndex).map((c) => ({
    table: 'shopping_items' as const,
    id: c.id,
    op: 'update' as const,
    patch: { position: c.position },
  }))
}
