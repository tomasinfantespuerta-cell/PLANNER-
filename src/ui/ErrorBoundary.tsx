import { Component, type ReactNode } from 'react'

/** Si algo falla al pintar, mejor un aviso que una pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Algo ha fallado</h1>
        <p className="rounded-2xl bg-aviso-claro p-3 text-left text-base break-words text-aviso">{this.state.error.message}</p>
        <button onClick={() => location.reload()} className="min-h-14 rounded-2xl bg-terra text-lg font-bold text-white">
          Volver a cargar
        </button>
      </main>
    )
  }
}
