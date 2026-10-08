import Dexie, { type Table } from 'dexie'
import type { AnyRow, DeadEntry, OutboxEntry, TableName } from './types'

/**
 * Copia local en IndexedDB. La interfaz SIEMPRE lee de aquí, así la app abre
 * al instante y funciona sin conexión. Los cambios pendientes de enviar viven
 * en `outbox` y sobreviven a cerrar la app o reiniciar el móvil.
 */
export class LocalDB extends Dexie {
  outbox!: Table<OutboxEntry, number>
  dead!: Table<DeadEntry, number>
  meta!: Table<{ key: string; value: unknown }, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      shopping_items: 'id',
      recipes: 'id',
      menu_days: 'id',
      // Como mucho una entrada pendiente por fila (índice único).
      outbox: '++seq, &[table+rowId]',
      dead: '++seq',
      meta: 'key',
    })
  }

  rows(table: TableName): Table<AnyRow, string> {
    return this.table<AnyRow, string>(table)
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    return (await this.meta.get(key))?.value as T | undefined
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.meta.put({ key, value })
  }
}

export function localDbName(householdId: string): string {
  return `comidas-casa-${householdId}`
}
