import { useCallback, useMemo, useState } from 'react'
import { categoryById } from '../../lib/categories'
import { useEngine, useHousehold } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { AddItemBar } from './AddItemBar'
import { EditItemSheet } from './EditItemSheet'
import { useShoppingItems } from './hooks'
import { DoneItemRow } from './ItemRow'
import { buildView, groupByCategory, makeItem, planMove, type ListId, type ShoppingItem } from './logic'
import { SortableList } from './SortableList'

const groupKey = (list: ListId) => `comidas-casa.compra.agrupar${list === 'yo' ? '.yo' : ''}`

function readGroupPref(list: ListId): boolean {
  try {
    return localStorage.getItem(groupKey(list)) === '1'
  } catch {
    return false
  }
}

export function ShoppingPage({ list = 'familia' }: { list?: ListId }) {
  const engine = useEngine()
  const household = useHousehold()
  const { showUndo, confirm } = useFeedback()
  const items = useShoppingItems()
  const [grouped, setGrouped] = useState(() => readGroupPref(list))
  const [editingId, setEditingId] = useState<string | null>(null)

  const view = useMemo(() => buildView(items ?? [], list), [items, list])
  const editing = editingId ? view.pending.concat(view.done).find((i) => i.id === editingId) : undefined

  const toggleGrouped = () => {
    setGrouped((g) => {
      try {
        localStorage.setItem(groupKey(list), g ? '0' : '1')
      } catch {
        /* sin almacenamiento: no pasa nada */
      }
      return !g
    })
  }

  const add = (name: string, quantity: string, category: string) => {
    const item = makeItem({ name, quantity, category }, items ?? [], household.id, list)
    void engine.insert('shopping_items', { ...item })
  }

  const toggle = useCallback(
    (item: ShoppingItem) => {
      void engine.update('shopping_items', item.id, {
        checked: !item.checked,
        checked_at: item.checked ? null : new Date().toISOString(),
      })
    },
    [engine],
  )

  const move = useCallback(
    (list: ShoppingItem[], from: number, to: number) => {
      void engine.mutate(planMove(list, from, to))
    },
    [engine],
  )

  const save = (id: string, patch: Partial<ShoppingItem>) => {
    void engine.update('shopping_items', id, patch as Record<string, unknown>)
  }

  const remove = (item: ShoppingItem) => {
    setEditingId(null)
    void engine.remove('shopping_items', item.id)
    showUndo(`«${item.name}» borrado`, () => engine.restore('shopping_items', item.id))
  }

  const clearDone = async () => {
    const done = view.done
    if (done.length === 0) return
    const ok = await confirm({
      title: `¿Quitar ${done.length === 1 ? 'el producto tachado' : `los ${done.length} productos tachados`}?`,
      message: 'Desaparecerán de la lista.',
      confirmLabel: 'Sí, quitar',
      danger: true,
    })
    if (!ok) return
    const now = new Date().toISOString()
    await engine.mutate(done.map((i) => ({ table: 'shopping_items' as const, id: i.id, op: 'update' as const, patch: { deleted_at: now } })))
    showUndo(`${done.length} ${done.length === 1 ? 'producto quitado' : 'productos quitados'}`, () =>
      engine.mutate(done.map((i) => ({ table: 'shopping_items' as const, id: i.id, op: 'update' as const, patch: { deleted_at: null } }))),
    )
  }

  if (items === undefined) {
    return <p className="p-6 text-center text-lg text-gris">Cargando…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <AddItemBar onAdd={add} />

      {view.pending.length + view.done.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-gris">
          <span className="text-5xl" aria-hidden>🧺</span>
          <p className="text-lg">La lista está vacía.</p>
          <p className="text-base">Escribe arriba lo que haga falta comprar.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="text-lg font-bold whitespace-nowrap">
              Por comprar <span className="text-gris">({view.pending.length})</span>
            </h2>
            <button
              onClick={toggleGrouped}
              aria-pressed={grouped}
              className={`min-h-12 shrink-0 rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap ${
                grouped ? 'border-terra bg-terra-claro text-terra-oscuro' : 'border-borde bg-white text-gris'
              }`}
            >
              {grouped ? '✓ Por categorías' : 'Por categorías'}
            </button>
          </div>

          {view.pending.length === 0 && <p className="text-center text-lg text-oliva">¡Todo comprado! 🎉</p>}

          {grouped ? (
            groupByCategory(view.pending).map((g) => {
              const cat = categoryById(g.category)
              return (
                <section key={g.category} aria-label={cat.label}>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-terra-oscuro">
                    <span aria-hidden className="text-xl">{cat.emoji}</span>
                    {cat.label}
                  </h3>
                  <SortableList items={g.items} onMove={move} onToggle={toggle} onOpen={(i) => setEditingId(i.id)} />
                </section>
              )
            })
          ) : (
            <SortableList items={view.pending} onMove={move} onToggle={toggle} onOpen={(i) => setEditingId(i.id)} />
          )}

          {view.done.length > 0 && (
            <section aria-label="En el carro" className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h2 className="text-lg font-bold whitespace-nowrap text-gris">
                  En el carro <span>({view.done.length})</span>
                </h2>
                <button
                  onClick={clearDone}
                  className="min-h-12 shrink-0 rounded-full border-2 border-terra bg-white px-4 whitespace-nowrap text-base font-bold text-terra active:bg-terra-claro"
                >
                  Limpiar tachados
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {view.done.map((item) => (
                  <DoneItemRow key={item.id} item={item} onToggle={toggle} onOpen={(i) => setEditingId(i.id)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {editing && <EditItemSheet key={editing.id} item={editing} onSave={save} onDelete={remove} onClose={() => setEditingId(null)} />}
    </div>
  )
}
