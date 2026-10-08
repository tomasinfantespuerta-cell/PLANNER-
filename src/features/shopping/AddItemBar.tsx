import { useRef, useState } from 'react'
import { guessCategory } from '../../lib/categories'

export function AddItemBar({ onAdd }: { onAdd: (name: string, quantity: string, category: string) => void }) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      nameRef.current?.focus()
      return
    }
    onAdd(n, quantity.trim(), guessCategory(n))
    setName('')
    setQuantity('')
    nameRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border-2 border-borde bg-white p-3 shadow-sm">
      <label htmlFor="nuevo-producto" className="sr-only">Producto</label>
      <input
        id="nuevo-producto"
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Añadir producto…"
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="done"
        className="min-h-14 w-full rounded-2xl bg-crema px-4 text-lg placeholder:text-gris/70 focus:bg-white"
      />
      <div className="mt-2 flex gap-2">
        <label htmlFor="nueva-cantidad" className="sr-only">Cantidad (opcional)</label>
        <input
          id="nueva-cantidad"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Cantidad"
          autoComplete="off"
          enterKeyHint="done"
          className="min-h-14 min-w-0 flex-1 rounded-2xl bg-crema px-4 text-lg placeholder:text-gris/70 focus:bg-white"
        />
        <button type="submit" className="min-h-14 shrink-0 rounded-2xl bg-terra px-6 text-lg font-bold text-white active:scale-95">
          Añadir
        </button>
      </div>
    </form>
  )
}
