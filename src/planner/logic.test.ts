import { describe, expect, it } from 'vitest'
import type { Subbloque, Tarea } from './db'
import { checkId, diasHasta, parseImporte, pendientes, racha, tareasDeHoy } from './logic'

const t = (id: string, fecha: string | null, hecha = false): Tarea => ({ id, texto: id, fecha, hecha, creada: id, hechaEn: null })

describe('tareas', () => {
  it('las de días anteriores sin hacer pasan a hoy; las hechas no', () => {
    const hoy = '2026-10-08'
    const out = tareasDeHoy([t('a', hoy), t('b', '2026-10-07'), t('c', '2026-10-07', true), t('d', '2026-10-09'), t('e', null)], hoy)
    expect(out.map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('pendientes son las que no tienen fecha', () => {
    expect(pendientes([t('a', null), t('b', '2026-10-08')]).map((x) => x.id)).toEqual(['a'])
  })
})

describe('racha de hábitos', () => {
  // Hábito «Leer» en el bloque de las 7:00 de lunes (0) y martes (1).
  const subs: Subbloque[] = [
    { id: 'l', bloque: '0-7:00', texto: 'Leer', habito: true, orden: 1 },
    { id: 'm', bloque: '1-7:00', texto: 'leer ', habito: true, orden: 1 },
  ]
  it('cuenta solo los días que lo tienen y no rompe si hoy aún no está hecho', () => {
    // 2026-10-06 martes, 2026-10-05 lunes, 2026-09-29 martes, 2026-09-28 lunes
    const checks = new Set([checkId('m', '2026-10-06'), checkId('l', '2026-10-05'), checkId('m', '2026-09-29')])
    expect(racha('Leer', subs, checks, '2026-10-12')).toBe(3) // lunes 12 sin hacer aún
  })
  it('un día del horario sin hacer corta la racha', () => {
    const checks = new Set([checkId('l', '2026-10-05')])
    expect(racha('Leer', subs, checks, '2026-10-07')).toBe(0) // martes 6 sin hacer
  })
})

describe('dinero', () => {
  it('entiende importes en formato español', () => {
    expect(parseImporte('1.234,50')).toBe(1234.5)
    expect(parseImporte('12,5')).toBe(12.5)
    expect(parseImporte('-40')).toBe(40)
    expect(parseImporte('abc')).toBe(0)
  })
  it('días hasta una fecha', () => {
    expect(diasHasta('2026-10-15', '2026-10-08')).toBe(7)
    expect(diasHasta('2026-10-08', '2026-10-08')).toBe(0)
  })
})
