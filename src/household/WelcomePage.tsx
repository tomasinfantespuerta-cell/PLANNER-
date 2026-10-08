import { useState } from 'react'
import { createHousehold, joinHousehold, type Household } from './session'

type Step = 'inicio' | 'crear' | 'unirse' | 'creada'

export function WelcomePage({ onReady, embedded = false }: { onReady: (h: Household) => void; embedded?: boolean }) {
  const [step, setStep] = useState<Step>('inicio')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Household | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const input = 'min-h-16 w-full rounded-2xl border-2 border-borde bg-white px-4 text-xl'
  const primary = 'min-h-16 w-full rounded-2xl bg-terra text-xl font-bold text-white active:scale-[0.98] disabled:opacity-60'
  const secondary = 'min-h-16 w-full rounded-2xl border-2 border-borde bg-white text-xl font-semibold active:scale-[0.98]'

  return (
    <main className={`mx-auto flex max-w-md flex-col justify-center gap-6 ${embedded ? 'py-4' : 'min-h-dvh p-6 pt-safe'}`}>
      <div className="text-center">
        <div aria-hidden className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-[#fde8d4] text-5xl shadow-md">🍽️</div>
        <h1 className="mt-4 text-3xl font-extrabold">Comidas de casa</h1>
        <p className="mt-2 text-lg text-gris">Menú, lista de la compra y recetas, compartidos en familia. Escribe el mismo código de casa que en la app de comida.</p>
      </div>

      {step === 'inicio' && (
        <div className="flex flex-col gap-3">
          <button className={primary} onClick={() => setStep('unirse')}>
            Tengo un código de casa
          </button>
          <button className={secondary} onClick={() => setStep('crear')}>
            Crear casa nueva
          </button>
          <p className="text-center text-base text-gris">
            Si otra persona de casa ya usa la app, pídele su código.
          </p>
        </div>
      )}

      {step === 'unirse' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) void run(async () => onReady(await joinHousehold(code)))
          }}
        >
          <label htmlFor="codigo" className="text-lg font-semibold">Código de casa</label>
          <input
            id="codigo"
            className={input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="por ejemplo: ajo-tomate-1234"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <button className={primary} disabled={busy || !code.trim()}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className={secondary} onClick={() => setStep('inicio')}>
            Volver
          </button>
        </form>
      )}

      {step === 'crear' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void run(async () => {
              const h = await createHousehold(name.trim() || 'Casa')
              setCreated(h)
              setStep('creada')
            })
          }}
        >
          <label htmlFor="nombre" className="text-lg font-semibold">Nombre de la casa (opcional)</label>
          <input id="nombre" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Casa" autoFocus />
          <button className={primary} disabled={busy}>
            {busy ? 'Creando…' : 'Crear casa'}
          </button>
          <button type="button" className={secondary} onClick={() => setStep('inicio')}>
            Volver
          </button>
        </form>
      )}

      {step === 'creada' && created && (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-lg">¡Casa creada! Este es vuestro código:</p>
          <p className="rounded-3xl border-4 border-dashed border-terra bg-white px-4 py-6 text-2xl font-extrabold break-words text-terra-oscuro select-all">
            {created.code}
          </p>
          <p className="text-base text-gris">
            Dáselo a quien vaya a usar la app contigo. Siempre podrás verlo en <strong>Ajustes ⚙️</strong>.
          </p>
          <button className={primary} onClick={() => onReady(created)}>
            Empezar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-terra-claro p-4 text-center text-lg text-terra-oscuro">
          {error}
        </p>
      )}
    </main>
  )
}
