import { describe, expect, it } from 'vitest'
import { compareTs, tsToMicros } from './timestamps'

describe('timestamps', () => {
  it('entiende los distintos formatos de Postgres y conserva los microsegundos', () => {
    const a = tsToMicros('2026-09-27T10:00:00.123456+00:00')
    expect(tsToMicros('2026-09-27 10:00:00.123456+00')).toBe(a)
    expect(tsToMicros('2026-09-27T12:00:00.123456+02:00')).toBe(a)
    expect(tsToMicros('2026-09-27T10:00:00.123457+00:00')).toBe(a + 1)
    expect(tsToMicros('2026-09-27T10:00:00.12+00:00')).toBe(a - 3456)
    expect(tsToMicros('2026-09-27T10:00:00Z')).toBe(a - 123456)
  })

  it('compara correctamente y trata null como lo más antiguo', () => {
    expect(compareTs('2026-01-01T00:00:00.000001+00:00', '2026-01-01T00:00:00.000002+00:00')).toBe(-1)
    expect(compareTs('2026-01-01T00:00:00+00:00', '2026-01-01T00:00:00.000000Z')).toBe(0)
    expect(compareTs(null, '2020-01-01T00:00:00Z')).toBe(-1)
    expect(compareTs('2020-01-01T00:00:00Z', undefined)).toBe(1)
  })
})
