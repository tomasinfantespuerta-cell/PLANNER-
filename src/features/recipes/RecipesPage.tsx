import { useMemo, useState } from 'react'
import { difficultyLabel, FILTERS, filterRecipes, formatMinutes } from './logic'
import { useRecipes } from './hooks'
import { FAVORITE_TAG, isFavorite, isMine, nutritionFromTags } from './nutrition'
import { RecipeImage } from './RecipeImage'

/** Recetario familiar, o «Mis recetas» (mine) dentro de la pestaña Yo. */
export function RecipesPage({ go, mine = false }: { go: (path: string) => void; mine?: boolean }) {
  const base = mine ? 'yo/recetas' : 'recetas'
  const recipes = useRecipes()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const own = useMemo(() => (recipes ?? []).filter((r) => isMine(r.tags) === mine), [recipes, mine])
  const list = useMemo(() => filterRecipes(own, query, tag), [own, query, tag])

  if (recipes === undefined) return <p className="p-6 text-center text-lg text-gris">Cargando…</p>

  return (
    <div className="flex flex-col gap-4">
      {!mine && (
      <button
        onClick={() => go('recetas/ideas')}
        className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 border-terra bg-terra-claro px-4 text-left"
      >
        <span>
          <span className="block text-lg font-bold text-terra-oscuro">✨ Ideas de la semana</span>
          <span className="block text-base text-terra-oscuro">Recetas nuevas cada lunes</span>
        </span>
        <span aria-hidden className="text-2xl text-terra-oscuro">›</span>
      </button>
      )}

      <div className="flex gap-2">
        <label htmlFor="buscar-receta" className="sr-only">Buscar receta</label>
        <input
          id="buscar-receta"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Buscar receta o ingrediente"
          className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-borde bg-white px-4 text-lg placeholder:text-gris/70"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtros">
        <button
          onClick={() => setTag(null)}
          aria-pressed={tag === null}
          className={`min-h-12 shrink-0 rounded-full border-2 px-4 text-base font-semibold ${
            tag === null ? 'border-terra bg-terra text-white' : 'border-borde bg-white'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setTag(tag === FAVORITE_TAG ? null : FAVORITE_TAG)}
          aria-pressed={tag === FAVORITE_TAG}
          className={`min-h-12 shrink-0 rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap ${
            tag === FAVORITE_TAG ? 'border-terra bg-terra text-white' : 'border-borde bg-white'
          }`}
        >
          ⭐ Favoritas
        </button>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setTag(tag === f.id ? null : f.id)}
            aria-pressed={tag === f.id}
            className={`min-h-12 shrink-0 rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap ${
              tag === f.id ? 'border-terra bg-terra text-white' : 'border-borde bg-white'
            }`}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => go(`${base}/nueva`)}
        className="min-h-14 rounded-2xl border-2 border-dashed border-terra bg-white text-lg font-bold text-terra active:bg-terra-claro"
      >
        {mine ? '+ Apuntar receta' : '+ Nueva receta'}
      </button>

      {list.length === 0 ? (
        <p className="mt-6 text-center text-lg text-gris">
          {mine && own.filter((r) => !r.deleted_at).length === 0
            ? 'Aquí guardas tus recetas: las que te gusten o se te ocurran. Pulsa «Apuntar receta».'
            : tag === FAVORITE_TAG && !query
            ? 'Aún no hay favoritas. Abre una receta y pulsa la ☆.'
            : recipes.some((r) => !r.deleted_at)
              ? 'No hay recetas con esa búsqueda.'
              : mine
                ? 'No hay recetas con esa búsqueda.'
                : 'Cargando las recetas…'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => go(`${base}/${r.id}`)}
                className="flex w-full items-stretch overflow-hidden rounded-2xl border-2 border-borde bg-white text-left active:bg-crema-oscuro"
              >
                <RecipeImage recipe={r} className="h-24 w-24 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-2">
                  <span className="text-lg leading-tight font-bold">
                    {isFavorite(r.tags) && <span className="mr-1 text-aviso" aria-label="Favorita">★</span>}
                    {r.title}
                  </span>
                  <span className="text-base text-gris">
                    {[
                      formatMinutes(r.prep_minutes) && `⏱ ${formatMinutes(r.prep_minutes)}`,
                      difficultyLabel(r.difficulty),
                      nutritionFromTags(r.tags) && `${nutritionFromTags(r.tags)!.kcal} kcal`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
