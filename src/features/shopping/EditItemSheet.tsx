import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../../lib/categories'
import { capitalize, normalizeName } from '../../lib/text'
import { Sheet } from '../../ui/Sheet'
import { categoryOf, encodeCategory, listOf, type ShoppingItem } from './logic'

interface Props {
  item: ShoppingItem
  onSave: (id: string, patch: Partial<ShoppingItem>) => void
  onDelete: (item: ShoppingItem) => void
  onClose: () => void
}

/** Editar un producto. Cada cambio se guarda solo (no hay botón de guardar). */
export function EditItemSheet({ item, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity ?? '')
  const saved = useRef({ name: item.name, quantity: item.quantity ?? '' })

  const flushText = () => {
    const n = capitalize(name)
    const patch: Partial<ShoppingItem> = {}
    if (n && n !== saved.current.name) {
      patch.name = n
      patch.name_norm = normalizeName(n)
    }
    if (quantity.trim() !== saved.current.quantity) patch.quantity = quantity.trim() || null
    if (Object.keys(patch).length) {
      saved.current = { name: n || saved.current.name, quantity: quantity.trim() }
      onSave(item.id, patch)
    }
  }

  // Guardar mientras se escribe (con una pequeña espera) y al cerrar.
  const flushRef = useRef(flushText)
  flushRef.current = flushText
  useEffect(() => {
    const t = setTimeout(() => flushRef.current(), 500)
    return () => clearTimeout(t)
  }, [name, quantity])
  useEffect(() => () => flushRef.current(), [])

  return (
    <Sheet title="Editar producto" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-gris">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={flushText}
            className="min-h-14 rounded-2xl border-2 border-borde bg-white px-4 text-lg"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-gris">Cantidad</span>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={flushText}
            placeholder="Por ejemplo: 2 kg, 1 docena…"
            className="min-h-14 rounded-2xl border-2 border-borde bg-white px-4 text-lg placeholder:text-gris/60"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-base font-semibold text-gris">Categoría</legend>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const active = categoryOf(item) === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => onSave(item.id, { category: encodeCategory(listOf(item), c.id) })}
                  aria-pressed={active}
                  className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 px-3 text-left text-base font-semibold ${
                    active ? 'border-terra bg-terra-claro' : 'border-borde bg-white'
                  }`}
                >
                  <span aria-hidden className="text-xl">{c.emoji}</span>
                  {c.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <button
          onClick={() => onDelete(item)}
          className="mt-2 min-h-14 rounded-2xl border-2 border-terra text-lg font-bold text-terra active:bg-terra-claro"
        >
          🗑️ Borrar producto
        </button>
      </div>
    </Sheet>
  )
}
