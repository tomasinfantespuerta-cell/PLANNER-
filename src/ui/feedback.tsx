import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// ---------------------------------------------------------------- Avisos con "Deshacer"

interface ToastState {
  id: number
  message: string
  onUndo?: () => void | Promise<void>
}

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

interface FeedbackCtx {
  showUndo: (message: string, onUndo: () => void | Promise<void>) => void
  showInfo: (message: string) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const Ctx = createContext<FeedbackCtx | null>(null)

const TOAST_MS = 7000

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const counter = useRef(0)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  const showUndo = useCallback((message: string, onUndo: () => void | Promise<void>) => {
    setToast({ id: ++counter.current, message, onUndo })
  }, [])
  const showInfo = useCallback((message: string) => {
    setToast({ id: ++counter.current, message })
  }, [])
  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  )

  const close = (v: boolean) => {
    dialog?.resolve(v)
    setDialog(null)
  }

  return (
    <Ctx.Provider value={{ showUndo, showInfo, confirm }}>
      {children}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-3 pb-safe" role="status" aria-live="polite">
          <div key={toast.id} className="animar-subir flex w-full max-w-md items-center gap-3 rounded-2xl bg-tinta px-4 py-3 text-white shadow-xl">
            <span className="flex-1 text-base leading-snug">{toast.message}</span>
            {toast.onUndo && (
              <button
                className="min-h-12 rounded-xl bg-white px-4 text-base font-bold text-tinta active:scale-95"
                onClick={() => {
                  const fn = toast.onUndo
                  setToast(null)
                  void fn?.()
                }}
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="animar-subir w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-xl font-bold">{dialog.title}</h2>
            {dialog.message && <p className="mt-2 text-base text-gris">{dialog.message}</p>}
            <div className="mt-6 flex flex-col gap-3">
              <button
                autoFocus
                className={`min-h-14 rounded-2xl text-lg font-bold text-white active:scale-[0.98] ${dialog.danger ? 'bg-terra' : 'bg-oliva'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? 'Sí'}
              </button>
              <button className="min-h-14 rounded-2xl border-2 border-borde text-lg font-semibold" onClick={() => close(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useFeedback(): FeedbackCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFeedback fuera de FeedbackProvider')
  return ctx
}
