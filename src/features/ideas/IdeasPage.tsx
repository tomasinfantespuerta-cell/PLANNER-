import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { formatWeekRange, mondayOf, today } from '../../lib/dates'
import { useEngine, useHousehold } from '../../sync/EngineProvider'
import { formatMinutes } from '../recipes/logic'
import { nutritionForSlug } from '../recipes/nutrition'
import { RecipeImage } from '../recipes/RecipeImage'
import type { PoolRecipe } from './build'
import { ideaRecipeId, weeklyIdeas } from './logic'

/** Ids (ya guardados en el recetario) de estas ideas. */
function useSavedIdeas(ideas: PoolRecipe[]): Set<string> {
  const engine = useEngine()
  const household = useHousehold()
  const key = ideas.map((i) => i.slug).join(',')
  return (
    useLiveQuery(async () => {
      const saved = new Set<string>()
      for (const idea of ideas) {
        const row = await engine.db.rows('recipes').get(await ideaRecipeId(household.id, idea.slug))
        if (row && !row.deleted_at) saved.add(idea.slug)
      }
      return saved
    }, [engine, household.id, key]) ?? new Set()
  )
}

function IdeaCard({ idea, saved, onOpen }: { idea: PoolRecipe; saved: boolean; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-stretch overflow-hidden rounded-2xl border-2 border-borde bg-white text-left active:bg-crema-oscuro">
        <RecipeImage recipe={{ photo_path: null, tags: idea.tags, title: idea.title }} className="w-20 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
          <span className="text-lg leading-tight font-bold">{idea.title}</span>
          <span className="text-base text-gris">
            {[`⏱ ${formatMinutes(idea.prep_minutes)}`, nutritionForSlug(idea.slug) && `${nutritionForSlug(idea.slug)!.kcal} kcal`, saved && '✓ Guardada'].filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>
    </li>
  )
}

export function IdeasPage({ go, only }: { go: (path: string) => void; only?: 'saludable' }) {
  const household = useHousehold()
  const monday = mondayOf(today())
  const ideas = useMemo(() => weeklyIdeas(household.id, monday), [household.id, monday])
  const saved = useSavedIdeas([...ideas.saludable, ...ideas.familia])

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl bg-terra-claro p-4">
        <p className="text-lg font-bold text-terra-oscuro">✨ Ideas de la semana</p>
        <p className="text-base text-terra-oscuro">
          Semana del {formatWeekRange(monday)}. Cada lunes salen ideas nuevas. Si una te gusta, ábrela y pulsa «Guardar».
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-bold">🥗 Saludables</h2>
        <ul className="flex flex-col gap-2">
          {ideas.saludable.map((idea) => (
            <IdeaCard key={idea.slug} idea={idea} saved={saved.has(idea.slug)} onOpen={() => go(`recetas/ideas/${idea.slug}`)} />
          ))}
        </ul>
      </section>

      {only !== 'saludable' && (
        <section>
          <h2 className="mb-2 text-lg font-bold">👨‍👩‍👧‍👦 Para la familia</h2>
          <ul className="flex flex-col gap-2">
            {ideas.familia.map((idea) => (
              <IdeaCard key={idea.slug} idea={idea} saved={saved.has(idea.slug)} onOpen={() => go(`recetas/ideas/${idea.slug}`)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
