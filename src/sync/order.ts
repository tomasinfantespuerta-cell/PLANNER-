import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * Orden estable con "fractional indexing": cada elemento tiene una clave de texto
 * y se ordena comparándolas. Para mover un elemento solo hace falta cambiar SU
 * clave (a una entre sus nuevos vecinos), así dos móviles pueden reordenar a la
 * vez sin pisarse. Los empates se resuelven por id para que el orden sea
 * idéntico en todos los dispositivos.
 */

export interface Positioned {
  id: string
  position: string
}

/** Compara claves por unidades de código (igual que espera fractional-indexing). */
function cmpKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function comparePositioned(a: Positioned, b: Positioned): number {
  return cmpKey(a.position, b.position) || cmpKey(a.id, b.id)
}

export function sortByPosition<T extends Positioned>(items: T[]): T[] {
  return [...items].sort(comparePositioned)
}

/** Clave para colocar un elemento al final. */
export function keyAfterLast(items: Positioned[]): string {
  let max: string | null = null
  for (const it of items) if (max === null || cmpKey(it.position, max) > 0) max = it.position
  return generateKeyBetween(max, null)
}

/** Clave para colocar un elemento al principio. */
export function keyBeforeFirst(items: Positioned[]): string {
  let min: string | null = null
  for (const it of items) if (min === null || cmpKey(it.position, min) < 0) min = it.position
  return generateKeyBetween(null, min)
}

/**
 * Calcula los cambios de posición al mover un elemento de `fromIndex` a `toIndex`
 * dentro de `sorted` (ya ordenado con comparePositioned).
 *
 * Normalmente devuelve un único cambio (el del elemento movido). Si los vecinos
 * tienen claves repetidas (p. ej. dos móviles añadieron algo a la vez sin
 * conexión) también reasigna esas claves, respetando el orden que se ve en
 * pantalla, para que el resultado sea exactamente el que el usuario ha dejado.
 */
export function computeMove(
  sorted: Positioned[],
  fromIndex: number,
  toIndex: number,
): Array<{ id: string; position: string }> {
  if (fromIndex === toIndex) return []
  if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) return []

  const list = [...sorted]
  const [moved] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, moved)

  const lowerOf = (l: number) => (l > 0 ? list[l - 1].position : null)
  const upperOf = (r: number) => (r < list.length - 1 ? list[r + 1].position : null)
  const ok = (lo: string | null, hi: string | null) => lo === null || hi === null || cmpKey(lo, hi) < 0

  // Ventana mínima alrededor del elemento movido cuyas cotas estén estrictamente ordenadas.
  let l = toIndex
  let r = toIndex
  while (!ok(lowerOf(l), upperOf(r))) {
    if (l > 0) l--
    if (r < list.length - 1) r++
  }

  const keys = generateNKeysBetween(lowerOf(l), upperOf(r), r - l + 1)
  const changes: Array<{ id: string; position: string }> = []
  for (let i = l; i <= r; i++) {
    if (list[i].position !== keys[i - l] || list[i].id === moved.id) {
      changes.push({ id: list[i].id, position: keys[i - l] })
    }
  }
  return changes
}
