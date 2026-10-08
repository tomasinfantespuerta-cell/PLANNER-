/**
 * Convierte un timestamptz de Postgres (en cualquiera de los formatos que
 * devuelven PostgREST o Realtime) a microsegundos desde 1970, para poder
 * compararlos sin perder precisión.
 *   "2026-09-27T10:00:00.123456+00:00", "2026-09-27 10:00:00.12+00", "2026-09-27T10:00:00Z"
 */
export function tsToMicros(ts: string | null | undefined): number {
  if (!ts) return -Infinity
  const s = ts.trim().replace(' ', 'T')
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/.exec(s)
  if (!m) {
    const ms = Date.parse(s)
    return Number.isNaN(ms) ? -Infinity : ms * 1000
  }
  const [, base, frac = '', zoneRaw = 'Z'] = m
  let zone = zoneRaw
  if (/^[+-]\d{2}$/.test(zone)) zone += ':00'
  else if (/^[+-]\d{4}$/.test(zone)) zone = `${zone.slice(0, 3)}:${zone.slice(3)}`
  const ms = Date.parse(`${base}${zone}`)
  const micros = Number((frac + '000000').slice(0, 6))
  return ms * 1000 + micros
}

/** -1 si a es anterior a b, 0 si iguales, 1 si posterior. null cuenta como "muy antiguo". */
export function compareTs(a: string | null | undefined, b: string | null | undefined): number {
  const x = tsToMicros(a)
  const y = tsToMicros(b)
  return x < y ? -1 : x > y ? 1 : 0
}
