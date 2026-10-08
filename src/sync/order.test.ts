import { describe, expect, it } from 'vitest'
import { comparePositioned, computeMove, keyAfterLast, keyBeforeFirst, sortByPosition, type Positioned } from './order'

function makeList(n: number): Positioned[] {
  const out: Positioned[] = []
  for (let i = 0; i < n; i++) out.push({ id: `id${String(i).padStart(3, '0')}`, position: keyAfterLast(out) })
  return out
}

function applyMove(list: Positioned[], from: number, to: number): Positioned[] {
  const changes = computeMove(list, from, to)
  const map = new Map(changes.map((c) => [c.id, c.position]))
  return sortByPosition(list.map((it) => ({ ...it, position: map.get(it.id) ?? it.position })))
}

function expected(list: Positioned[], from: number, to: number): string[] {
  const ids = list.map((i) => i.id)
  const [m] = ids.splice(from, 1)
  ids.splice(to, 0, m)
  return ids
}

describe('orden por posición', () => {
  it('añadir al final y al principio mantiene el orden', () => {
    const list = makeList(5)
    expect(sortByPosition(list).map((i) => i.id)).toEqual(list.map((i) => i.id))
    const first = { id: 'zzz', position: keyBeforeFirst(list) }
    expect(sortByPosition([...list, first])[0].id).toBe('zzz')
  })

  it('mover un elemento solo cambia ese elemento', () => {
    const list = makeList(6)
    const changes = computeMove(list, 4, 1)
    expect(changes).toHaveLength(1)
    expect(changes[0].id).toBe(list[4].id)
    expect(applyMove(list, 4, 1).map((i) => i.id)).toEqual(expected(list, 4, 1))
  })

  it('mover al principio, al final y a la misma posición', () => {
    const list = makeList(4)
    expect(applyMove(list, 3, 0).map((i) => i.id)).toEqual(expected(list, 3, 0))
    expect(applyMove(list, 0, 3).map((i) => i.id)).toEqual(expected(list, 0, 3))
    expect(computeMove(list, 2, 2)).toEqual([])
    expect(computeMove(list, 9, 0)).toEqual([])
  })

  it('con claves repetidas (dos móviles añadieron a la vez) reasigna sin alterar lo que se ve', () => {
    // a, b, c tienen la misma clave: se muestran por id.
    const list = sortByPosition([
      { id: 'x', position: 'a0' },
      { id: 'a', position: 'a1' },
      { id: 'b', position: 'a1' },
      { id: 'c', position: 'a1' },
      { id: 'y', position: 'a2' },
    ])
    expect(list.map((i) => i.id)).toEqual(['x', 'a', 'b', 'c', 'y'])
    const after = applyMove(list, 0, 2) // x entre b y c
    expect(after.map((i) => i.id)).toEqual(['a', 'b', 'x', 'c', 'y'])
    // Y ahora no hay claves repetidas en el tramo tocado.
    const keys = after.map((i) => i.position)
    for (let i = 1; i < keys.length; i++) expect(keys[i - 1] < keys[i]).toBe(true)
  })

  it('miles de movimientos aleatorios dan siempre el orden esperado', () => {
    let list = makeList(12)
    let seed = 42
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
    for (let k = 0; k < 2000; k++) {
      const from = Math.floor(rand() * list.length)
      const to = Math.floor(rand() * list.length)
      const want = expected(list, from, to)
      list = applyMove(list, from, to)
      expect(list.map((i) => i.id)).toEqual(want)
    }
    // Orden total estricto, sin empates.
    for (let i = 1; i < list.length; i++) expect(comparePositioned(list[i - 1], list[i])).toBeLessThan(0)
  })
})
