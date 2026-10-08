import Dexie, { type Table } from 'dexie'

/*
 * Datos propios del planner (tareas, listas, notas, exámenes, subbloques y
 * dinero). Se guardan en este móvil; la comida va aparte, sincronizada con la
 * casa. En Ajustes hay copia de seguridad para no perder nada.
 */

export interface Tarea {
  id: string
  texto: string
  /** Día de la tarea ('2026-10-08'). null = pendiente sin fecha. */
  fecha: string | null
  hecha: boolean
  creada: string
  hechaEn: string | null
}

export interface CosaComprar {
  id: string
  texto: string
  hecha: boolean
  creada: string
}

export interface Nota {
  id: string
  texto: string
  creada: string
  editada: string
}

export interface Examen {
  id: string
  titulo: string
  fecha: string
  tipo: 'examen' | 'entrega'
  hecho: boolean
}

/** Paso dentro de un bloque del horario (p. ej. «Leer 20 min» en el bloque de mañana). */
export interface Subbloque {
  id: string
  /** Bloque al que pertenece: ver bloqueKey(). */
  bloque: string
  texto: string
  /** Los hábitos cuentan racha de días seguidos. */
  habito: boolean
  orden: number
}

/** Un subbloque marcado como hecho en una fecha. id = `${subId}|${fecha}` */
export interface Check {
  id: string
  subId: string
  fecha: string
}

export interface Fila {
  id: string
  concepto: string
  importe: number
}

export interface Mes {
  /** '2026-10' */
  key: string
  ingresos: Fila[]
  gastosFijos: Fila[]
  gastosVariables: Fila[]
}

export interface Ajuste {
  key: string
  value: unknown
}

class PlannerDB extends Dexie {
  tareas!: Table<Tarea, string>
  comprar!: Table<CosaComprar, string>
  notas!: Table<Nota, string>
  examenes!: Table<Examen, string>
  subbloques!: Table<Subbloque, string>
  checks!: Table<Check, string>
  meses!: Table<Mes, string>
  ajustes!: Table<Ajuste, string>

  constructor() {
    super('planner')
    this.version(1).stores({
      tareas: 'id, fecha, hecha',
      comprar: 'id',
      notas: 'id, editada',
      examenes: 'id, fecha',
      subbloques: 'id, bloque',
      checks: 'id, subId, fecha',
      meses: 'key',
      ajustes: 'key',
    })
  }
}

export const pdb = new PlannerDB()

export const TABLAS = ['tareas', 'comprar', 'notas', 'examenes', 'subbloques', 'checks', 'meses', 'ajustes'] as const

export function uid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

export const ahora = () => new Date().toISOString()

export async function getAjuste<T>(key: string, fallback: T): Promise<T> {
  const a = await pdb.ajustes.get(key)
  return a ? (a.value as T) : fallback
}

export function setAjuste(key: string, value: unknown) {
  return pdb.ajustes.put({ key, value })
}

/** Copia de seguridad: todo el planner en un JSON. */
export async function exportar(): Promise<string> {
  const out: Record<string, unknown> = { app: 'planner', version: 1, fecha: ahora() }
  for (const t of TABLAS) out[t] = await pdb.table(t).toArray()
  return JSON.stringify(out, null, 1)
}

export async function importar(json: string) {
  const data = JSON.parse(json) as Record<string, unknown>
  if (data.app !== 'planner') throw new Error('Este archivo no es una copia del planner.')
  await pdb.transaction('rw', TABLAS.map((t) => pdb.table(t)), async () => {
    for (const t of TABLAS) {
      const rows = data[t]
      if (!Array.isArray(rows)) continue
      await pdb.table(t).clear()
      await pdb.table(t).bulkPut(rows)
    }
  })
}
