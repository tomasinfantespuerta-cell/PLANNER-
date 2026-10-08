import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useEngine, useHousehold } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import type { Recipe } from '../recipes/logic'
import { isFavorite, nutritionForSlug, withFavorite, withNutrition } from '../recipes/nutrition'
import { RecipeView } from '../recipes/RecipeView'
import { findIdea, ideaRecipeId, planSaveIdea } from './logic'

export function IdeaDetail({ slug, go }: { slug: string; go: (path: string) => void }) {
  const engine = useEngine()
  const household = useHousehold()
  const { showInfo } = useFeedback()
  const found = findIdea(slug)
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    void ideaRecipeId(household.id, slug).then(setId)
  }, [household.id, slug])

  const savedRow = useLiveQuery(async () => {
    if (!id) return null
    const row = (await engine.db.rows('recipes').get(id)) as unknown as Recipe | undefined
    return row && !row.deleted_at ? row : null
  }, [engine, id])
  const saved = Boolean(savedRow)

  if (!found) {
    return <p className="mt-10 text-center text-lg text-gris">Esta idea ya no está disponible.</p>
  }
  const { idea } = found

  const ensureSaved = async (): Promise<string> => {
    const rid = id ?? (await ideaRecipeId(household.id, slug))
    const row = await engine.db.rows('recipes').get(rid)
    if (!row || row.deleted_at) await engine.mutate([planSaveIdea(rid, idea)])
    return rid
  }

  const toggleFavorite = async () => {
    const on = !isFavorite(savedRow?.tags)
    const rid = await ensureSaved()
    const row = (await engine.db.rows('recipes').get(rid)) as unknown as Recipe | undefined
    await engine.update('recipes', rid, { tags: withFavorite(row?.tags ?? idea.tags, on) })
    showInfo(on ? 'Guardada en favoritas ⭐' : 'Quitada de favoritas')
  }

  const save = async () => {
    await ensureSaved()
    showInfo('Guardada en el recetario ⭐')
  }

  const recipe: Recipe = {
    id: id ?? `idea-${slug}`,
    household_id: household.id,
    title: idea.title,
    photo_path: null,
    prep_minutes: idea.prep_minutes,
    difficulty: idea.difficulty,
    servings: idea.servings,
    tags: savedRow?.tags ?? withNutrition(idea.tags, nutritionForSlug(idea.slug)),
    ingredients: idea.ingredients,
    steps: idea.steps,
  }

  return (
    <RecipeView
      recipe={recipe}
      ensureSaved={ensureSaved}
      onToggleFavorite={() => void toggleFavorite()}
      extraAction={
        saved ? (
          <button onClick={() => id && go(`recetas/${id}`)} className="min-h-14 rounded-2xl border-2 border-oliva bg-oliva-claro text-lg font-bold text-oliva">
            ✓ Ya está en el recetario
          </button>
        ) : (
          <button onClick={() => void save()} className="min-h-16 rounded-2xl border-2 border-terra bg-white text-lg font-bold text-terra active:bg-terra-claro">
            ⭐ Guardar en el recetario
          </button>
        )
      }
    />
  )
}
