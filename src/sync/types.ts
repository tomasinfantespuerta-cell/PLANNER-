export type TableName = 'shopping_items' | 'recipes' | 'menu_days'

export const TABLES: TableName[] = ['shopping_items', 'recipes', 'menu_days']

/** Campos comunes a todas las filas sincronizadas. */
export interface BaseRow {
  id: string
  household_id: string
  /** Lo pone el servidor. Sirve para saber qué versión es más reciente. */
  updated_at?: string | null
  created_at?: string | null
  /** Borrado "suave": la fila se queda en la BD para poder deshacer. */
  deleted_at?: string | null
}

export type AnyRow = BaseRow & Record<string, unknown>

/** Cambio pendiente de enviar al servidor. Hay como mucho uno por fila. */
export interface OutboxEntry {
  seq?: number
  table: TableName
  rowId: string
  /** insert = la fila aún no existe en el servidor; update = cambio parcial. */
  op: 'insert' | 'update'
  /** Campos a escribir (parcial). La primera vez contiene la fila completa. */
  patch: Record<string, unknown>
  /** Se incrementa cada vez que se fusiona un cambio nuevo en esta entrada. */
  version: number
  createdAt: string
}

/** Cambio que el servidor rechazó por datos inválidos (no por falta de red). */
export interface DeadEntry extends OutboxEntry {
  error: string
  failedAt: string
}

export interface Mutation {
  table: TableName
  id: string
  op: 'insert' | 'update'
  patch: Record<string, unknown>
}
