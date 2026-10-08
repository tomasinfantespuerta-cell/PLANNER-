import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useMemo, useState } from 'react'
import { SortableItemRow } from './ItemRow'
import type { ShoppingItem } from './logic'

interface Props {
  items: ShoppingItem[]
  onMove: (items: ShoppingItem[], from: number, to: number) => void
  onToggle: (item: ShoppingItem) => void
  onOpen: (item: ShoppingItem) => void
}

export function SortableList({ items, onMove, onToggle, onOpen }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Mientras la base de datos local confirma el cambio, mostramos ya el nuevo
  // orden para que el producto no "rebote" al soltarlo.
  const [override, setOverride] = useState<string[] | null>(null)
  useEffect(() => setOverride(null), [items])
  const shown = useMemo(() => {
    if (!override) return items
    const byId = new Map(items.map((i) => [i.id, i]))
    const out = override.map((id) => byId.get(id)).filter(Boolean) as ShoppingItem[]
    return out.length === items.length ? out : items
  }, [items, override])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    setOverride(arrayMove(items, from, to).map((i) => i.id))
    onMove(items, from, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={shown.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {shown.map((item) => (
            <SortableItemRow key={item.id} item={item} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
