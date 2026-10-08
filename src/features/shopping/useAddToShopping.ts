import { useCallback } from 'react'
import { useEngine, useHousehold } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { useShoppingItems } from './hooks'
import { planAddMany, type ListId, type NewItemInput } from './logic'

/** Añade productos a una lista sin duplicar, con aviso y «Deshacer». */
export function useAddToShopping() {
  const engine = useEngine()
  const household = useHousehold()
  const shopping = useShoppingItems()
  const { showUndo, showInfo } = useFeedback()

  return useCallback(
    async (inputs: NewItemInput[], list: ListId) => {
      const where = list === 'yo' ? 'a tu compra' : 'a la compra'
      if (inputs.length === 0) {
        showInfo('No hay ingredientes que añadir')
        return
      }
      const plan = planAddMany(inputs, shopping ?? [], household.id, list)
      if (plan.mutations.length === 0) {
        showInfo(`Todo ya estaba en la lista ✓`)
        return
      }
      await engine.mutate(plan.mutations)
      const now = new Date().toISOString()
      const undo = plan.mutations.map((m) =>
        m.op === 'insert'
          ? { ...m, op: 'update' as const, patch: { deleted_at: now } }
          : { ...m, patch: { checked: true, checked_at: now } },
      )
      const n = plan.added.length + plan.reactivated.length
      const extra = plan.skipped.length ? ` (${plan.skipped.length} ya estaban)` : ''
      showUndo(`${n} ${n === 1 ? 'producto añadido' : 'productos añadidos'} ${where}${extra}`, () => engine.mutate(undo))
    },
    [engine, household.id, shopping, showInfo, showUndo],
  )
}
