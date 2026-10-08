import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ShoppingItem } from './logic'

interface Props {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onOpen: (item: ShoppingItem) => void
}

function Check({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] text-xl font-black ${
        checked ? 'border-oliva bg-oliva text-white' : 'border-gris/50 bg-white text-transparent'
      }`}
    >
      ✓
    </span>
  )
}

function Content({ item, onToggle, onOpen }: Props) {
  return (
    <>
      <button
        onClick={() => onToggle(item)}
        className="flex min-h-16 shrink-0 items-center pl-3 pr-2"
        aria-label={item.checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
        aria-pressed={item.checked}
      >
        <Check checked={item.checked} />
      </button>
      <button onClick={() => onOpen(item)} className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-2 pr-2 text-left">
        <span className={`text-lg leading-tight font-semibold break-words ${item.checked ? 'text-gris line-through' : ''}`}>
          {item.name}
        </span>
        {item.quantity && (
          <span className={`text-base leading-tight ${item.checked ? 'text-gris/80 line-through' : 'text-gris'}`}>{item.quantity}</span>
        )}
      </button>
    </>
  )
}

/** Producto pendiente: se puede tachar, abrir y arrastrar desde el asa. */
export function SortableItemRow(props: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-stretch rounded-2xl border-2 bg-white ${
        isDragging ? 'relative z-10 border-terra shadow-xl' : 'border-borde'
      }`}
    >
      <Content {...props} />
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Mover ${props.item.name}`}
        className="flex w-14 shrink-0 cursor-grab touch-none items-center justify-center rounded-r-2xl text-2xl text-gris active:cursor-grabbing active:bg-crema-oscuro"
      >
        <span aria-hidden>≡</span>
      </button>
    </li>
  )
}

/** Producto tachado ("en el carro"). */
export function DoneItemRow(props: Props) {
  return (
    <li className="flex items-stretch rounded-2xl border-2 border-transparent bg-crema-oscuro/60">
      <Content {...props} />
    </li>
  )
}
