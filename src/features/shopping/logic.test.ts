import { describe, expect, it } from 'vitest'
import { guessCategory } from '../../lib/categories'
import { normalizeName } from '../../lib/text'
import { buildView, categoryOf, groupByCategory, listOf, makeItem, planAddMany, planMove, type ShoppingItem } from './logic'

const H = 'casa'

function list(names: string[]): ShoppingItem[] {
  const out: ShoppingItem[] = []
  for (const n of names) out.push(makeItem({ name: n }, out, H))
  return out
}

describe('lista de la compra', () => {
  it('los tachados van al final en el orden en que se tacharon, y vuelven a su sitio al destacharlos', () => {
    const items = list(['Pan', 'Leche', 'Huevos', 'Arroz'])
    items[0] = { ...items[0], checked: true, checked_at: '2026-01-01T10:05:00Z' }
    items[2] = { ...items[2], checked: true, checked_at: '2026-01-01T10:01:00Z' }
    let v = buildView(items)
    expect(v.pending.map((i) => i.name)).toEqual(['Leche', 'Arroz'])
    expect(v.done.map((i) => i.name)).toEqual(['Huevos', 'Pan'])

    items[0] = { ...items[0], checked: false, checked_at: null }
    v = buildView(items)
    expect(v.pending.map((i) => i.name)).toEqual(['Pan', 'Leche', 'Arroz'])
  })

  it('no muestra lo borrado', () => {
    const items = list(['Pan', 'Leche'])
    items[0] = { ...items[0], deleted_at: '2026-01-01T00:00:00Z' }
    expect(buildView(items).pending.map((i) => i.name)).toEqual(['Leche'])
  })

  it('añadir en bloque no duplica (sin importar tildes ni mayúsculas)', () => {
    const items = list(['Plátanos', 'leche'])
    const plan = planAddMany([{ name: 'platanos' }, { name: 'LECHE' }, { name: 'Ajo' }, { name: 'ajo' }], items, H)
    expect(plan.added).toEqual(['Ajo'])
    expect(plan.skipped).toEqual(['Plátanos', 'Leche'])
    expect(plan.mutations).toHaveLength(1)
  })

  it('si el producto ya estaba tachado, lo vuelve a poner pendiente en vez de duplicarlo', () => {
    const items = list(['Pan'])
    items[0] = { ...items[0], checked: true, checked_at: '2026-01-01T00:00:00Z' }
    const plan = planAddMany([{ name: 'pan' }], items, H)
    expect(plan.reactivated).toEqual(['Pan'])
    expect(plan.mutations[0]).toMatchObject({ id: items[0].id, op: 'update', patch: { checked: false } })
  })

  it('los productos nuevos se añaden al final en orden', () => {
    const items = list(['Pan'])
    const plan = planAddMany([{ name: 'Ajo' }, { name: 'Cebolla' }], items, H)
    const all = [...items, ...plan.mutations.map((m) => m.patch as unknown as ShoppingItem)]
    expect(buildView(all).pending.map((i) => i.name)).toEqual(['Pan', 'Ajo', 'Cebolla'])
  })

  it('arrastrar genera el cambio de posición correcto', () => {
    const items = list(['A', 'B', 'C'])
    const muts = planMove(items, 2, 0)
    const map = new Map(muts.map((m) => [m.id, m.patch.position as string]))
    const moved = items.map((i) => ({ ...i, position: map.get(i.id) ?? i.position }))
    expect(buildView(moved).pending.map((i) => i.name)).toEqual(['C', 'A', 'B'])
  })

  it('agrupa por categorías en el orden fijo y manda lo desconocido a "Otros"', () => {
    const items = list(['Lejía', 'Manzanas', 'Cosa rara'])
    items[0].category = 'limpieza'
    items[1].category = 'fruta_verdura'
    items[2].category = 'inventada'
    expect(groupByCategory(items).map((g) => g.category)).toEqual(['fruta_verdura', 'limpieza', 'otros'])
  })
})

describe('utilidades', () => {
  it('normaliza nombres', () => {
    expect(normalizeName('  Plátanos  de Canarias! ')).toBe('platanos de canarias')
    expect(normalizeName('Piña')).toBe('pina')
  })

  it('adivina categorías habituales', () => {
    expect(guessCategory('Leche entera')).toBe('lacteos_huevos')
    expect(guessCategory('Tomate frito')).toBe('despensa')
    expect(guessCategory('Tomates')).toBe('fruta_verdura')
    expect(guessCategory('Lejía')).toBe('limpieza')
    expect(guessCategory('Merluza')).toBe('carne_pescado')
    expect(guessCategory('Algo raro')).toBe('otros')
  })
})

describe('lista familiar y lista personal', () => {
  it('cada lista muestra solo lo suyo', () => {
    const all: ShoppingItem[] = []
    all.push(makeItem({ name: 'Leche', category: 'lacteos_huevos' }, all, H))
    all.push(makeItem({ name: 'Boniato', category: 'fruta_verdura' }, all, H, 'yo'))
    expect(buildView(all).pending.map((i) => i.name)).toEqual(['Leche'])
    expect(buildView(all, 'yo').pending.map((i) => i.name)).toEqual(['Boniato'])
    expect(listOf(all[1])).toBe('yo')
    expect(categoryOf(all[1])).toBe('fruta_verdura')
    expect(groupByCategory(buildView(all, 'yo').pending).map((g) => g.category)).toEqual(['fruta_verdura'])
  })

  it('no duplica dentro de la misma lista, pero sí se puede tener lo mismo en las dos', () => {
    const all: ShoppingItem[] = [makeItem({ name: 'Pollo' }, [], H)]
    const yo = planAddMany([{ name: 'pollo' }], all, H, 'yo')
    expect(yo.added).toEqual(['Pollo'])
    expect(listOf(yo.mutations[0].patch as unknown as ShoppingItem)).toBe('yo')
    const fam = planAddMany([{ name: 'pollo' }], all, H, 'familia')
    expect(fam.skipped).toEqual(['Pollo'])
  })
})
