import { useState, type ReactNode } from 'react'

export const card = 'rounded-3xl border-2 border-borde bg-white p-4'

export function Seccion({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-lg font-extrabold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

/** Caja para escribir algo y añadirlo con Enter o con el botón. */
export function AddBar({ placeholder, onAdd, boton = 'Añadir' }: { placeholder: string; onAdd: (texto: string) => unknown; boton?: string }) {
  const [texto, setTexto] = useState('')
  const enviar = async () => {
    const t = texto.trim()
    if (!t) return
    setTexto('')
    await onAdd(t)
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-borde bg-white px-4 text-lg outline-none focus:border-terra"
      />
      <button type="submit" className="min-h-14 shrink-0 rounded-2xl bg-terra px-4 text-lg font-bold text-white disabled:opacity-50" disabled={!texto.trim()}>
        {boton}
      </button>
    </form>
  )
}

export function Circulo({ hecho, onClick, label }: { hecho: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={hecho}
      aria-label={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-lg font-bold ${
          hecho ? 'border-oliva bg-oliva text-white' : 'border-borde bg-white'
        }`}
      >
        {hecho ? '✓' : ''}
      </span>
    </button>
  )
}

/** Fila de una lista con círculo para marcar, texto y acciones a la derecha. */
export function FilaCheck({
  hecho,
  texto,
  onToggle,
  sub,
  children,
}: {
  hecho: boolean
  texto: string
  onToggle: () => void
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <li className="flex min-h-14 items-center gap-1 border-t-2 border-crema-oscuro py-1 first:border-t-0">
      <Circulo hecho={hecho} onClick={onToggle} label={texto} />
      <div className="min-w-0 flex-1">
        <p className={`text-lg break-words ${hecho ? 'text-gris line-through' : ''}`}>{texto}</p>
        {sub}
      </div>
      {children}
    </li>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-center text-base text-gris">{children}</p>
}

export function Segmentos<T extends string>({ value, onChange, opciones }: { value: T; onChange: (v: T) => void; opciones: Array<[T, string, string]> }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-crema-oscuro p-1" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }} role="tablist">
      {opciones.map(([id, icon, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-sm leading-tight font-bold ${
            value === id ? 'bg-white text-terra shadow-sm' : 'text-gris'
          }`}
        >
          <span aria-hidden className="text-xl">
            {icon}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}

/** Guarda en este móvil qué sub-pestaña estaba abierta. */
export function usePestana<T extends string>(key: string, validas: readonly T[], porDefecto: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key) as T | null
      return s && validas.includes(s) ? s : porDefecto
    } catch {
      return porDefecto
    }
  })
  return [
    v,
    (nv) => {
      setV(nv)
      try {
        localStorage.setItem(key, nv)
      } catch {
        /* sin almacenamiento */
      }
    },
  ]
}
