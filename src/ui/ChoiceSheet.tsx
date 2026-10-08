import { Sheet } from './Sheet'

/** Elegir entre varias opciones grandes (p. ej. «Compra familiar» o «Mi compra»). */
export function ChoiceSheet<T extends string>({
  title,
  options,
  onChoose,
  onClose,
}: {
  title: string
  options: Array<{ id: T; label: string; hint?: string }>
  onChoose: (id: T) => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              onClose()
              onChoose(o.id)
            }}
            className="flex min-h-16 flex-col items-start justify-center rounded-2xl border-2 border-borde bg-white px-4 py-2 text-left active:bg-terra-claro"
          >
            <span className="text-lg font-bold">{o.label}</span>
            {o.hint && <span className="text-base text-gris">{o.hint}</span>}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
