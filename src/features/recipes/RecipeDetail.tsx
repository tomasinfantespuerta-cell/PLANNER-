import { useEngine } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { useRecipe } from './hooks'
import { usePersonalEnabled } from '../../lib/personal'
import { isFavorite, isMine, withFavorite, withMine } from './nutrition'
import { RecipeView } from './RecipeView'

export function RecipeDetail({ id, go, base = 'recetas' }: { id: string; go: (path: string) => void; base?: string }) {
  const personal = usePersonalEnabled()
  const engine = useEngine()
  const { showUndo, showInfo, confirm } = useFeedback()
  const recipe = useRecipe(id)

  if (recipe === undefined) return <p className="p-6 text-center text-lg text-gris">Cargando…</p>
  if (recipe === null || recipe.deleted_at) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-lg text-gris">Esta receta ya no existe.</p>
        <button onClick={() => go(base)} className="min-h-14 rounded-2xl bg-terra px-6 text-lg font-bold text-white">
          Ver recetas
        </button>
      </div>
    )
  }

  const remove = async () => {
    const ok = await confirm({
      title: `¿Borrar «${recipe.title}»?`,
      message: 'Desaparecerá del recetario de todos los móviles.',
      confirmLabel: 'Sí, borrar',
      danger: true,
    })
    if (!ok) return
    await engine.remove('recipes', recipe.id)
    go(base)
    showUndo('Receta borrada', () => engine.restore('recipes', recipe.id))
  }

  return (
    <RecipeView
      recipe={recipe}
      onToggleFavorite={() => {
        const on = !isFavorite(recipe.tags)
        void engine.update('recipes', recipe.id, { tags: withFavorite(recipe.tags, on) })
        showInfo(on ? 'Añadida a favoritas ⭐' : 'Quitada de favoritas')
      }}
      footer={
        <div className="flex flex-col gap-3">
        {personal && (
          <button
            onClick={() => {
              const toMine = !isMine(recipe.tags)
              void engine.update('recipes', recipe.id, { tags: withMine(recipe.tags, toMine) })
              go(toMine ? `yo/recetas/${recipe.id}` : `recetas/${recipe.id}`)
              showInfo(toMine ? 'Movida a Mis recetas' : 'Movida al recetario familiar')
            }}
            className="min-h-14 rounded-2xl border-2 border-borde bg-white text-lg font-semibold"
          >
            {isMine(recipe.tags) ? '👨‍👩‍👧‍👦 Pasar al recetario familiar' : '🥗 Pasar a Mis recetas'}
          </button>
        )}
        <div className="flex gap-3">
          <button onClick={() => go(`${base}/${recipe.id}/editar`)} className="min-h-14 flex-1 rounded-2xl border-2 border-borde bg-white text-lg font-semibold">
            ✏️ Editar
          </button>
          <button onClick={() => void remove()} className="min-h-14 flex-1 rounded-2xl border-2 border-terra bg-white text-lg font-semibold text-terra">
            🗑️ Borrar
          </button>
        </div>
        </div>
      }
    />
  )
}
