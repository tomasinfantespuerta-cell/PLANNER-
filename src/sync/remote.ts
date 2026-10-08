import type { AnyRow, TableName } from './types'

/** Error temporal (sin red, servidor caído, sesión caducada...). Se reintenta. */
export class TransientError extends Error {
  readonly transient = true
}

/** El servidor rechaza el cambio por los datos en sí. Reintentar no sirve. */
export class PermanentError extends Error {
  readonly permanent = true
}

/** Lo que el motor de sincronización necesita del servidor. */
export interface Remote {
  /** Crea (o sobrescribe entera) una fila. Idempotente. Devuelve la fila guardada. */
  insert(table: TableName, row: Record<string, unknown>): Promise<AnyRow>
  /** Aplica un cambio parcial a una fila existente. Devuelve la fila guardada. */
  update(table: TableName, householdId: string, id: string, patch: Record<string, unknown>): Promise<AnyRow>
  /** Filas (incluidas las borradas) con updated_at >= since. */
  pullSince(table: TableName, householdId: string, since: string | null): Promise<AnyRow[]>
}
