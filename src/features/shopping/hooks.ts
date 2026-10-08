import { useLiveQuery } from 'dexie-react-hooks'
import { useEngine } from '../../sync/EngineProvider'
import type { ShoppingItem } from './logic'

/** Todos los productos (incluidos borrados), leídos de la copia local. */
export function useShoppingItems(): ShoppingItem[] | undefined {
  const engine = useEngine()
  return useLiveQuery(
    () => engine.db.rows('shopping_items').toArray() as unknown as Promise<ShoppingItem[]>,
    [engine],
  )
}
