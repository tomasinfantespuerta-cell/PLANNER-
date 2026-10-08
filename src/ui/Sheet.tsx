import { useEffect, type ReactNode } from 'react'

/** Panel que sube desde abajo (cómodo con una mano). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animar-subir max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-crema p-5 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="min-h-12 rounded-xl bg-crema-oscuro px-4 text-base font-semibold">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
