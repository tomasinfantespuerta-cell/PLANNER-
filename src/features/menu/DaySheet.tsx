import { useEffect, useMemo, useRef, useState } from 'react'
import { formatShortDate, weekdayName } from '../../lib/dates'
import { useEngine } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { Sheet } from '../../ui/Sheet'
import { filterRecipes } from '../recipes/logic'
import { useRecipes } from '../recipes/hooks'
import { isFavorite, isMine } from '../recipes/nutrition'
import { RecipeImage } from '../recipes/RecipeImage'
import { dishLabel, hasDish, planSetDay, type MenuDay, type MenuScope } from './logic'

interface Props {
  scope: MenuScope
  date: string
  day: MenuDay | undefined
  onClose: () => void
  onOpenRecipe: (id: string) => void
}

/** Poner el plato de un día: escribiéndolo o eligiéndolo del recetario. */
export function DaySheet({ scope, date, day, onClose, onOpenRecipe }: Props) {
  const engine = useEngine()
  const { showUndo } = useFeedback()
  const recipes = useRecipes()
  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const [text, setText] = useState(() => dishLabel(day, recipeMap) ?? '')
  const [query, setQuery] = useState('')
  const saved = useRef(text)
  const done = useRef(false) // tras elegir receta o quitar, no volver a guardar el texto
  const linked = day?.recipe_id ? recipeMap.get(day.recipe_id) : undefined

  // Lo escrito a mano se guarda solo.
  const saveText = () => {
    if (done.current) return
    const t = text.trim()
    if (t === saved.current.trim()) return
    saved.current = t
    const keepRecipe = linked && !linked.deleted_at && linked.title === t
    void engine.mutate([planSetDay(scope, date, t ? { dish_text: t, recipe_id: keepRecipe ? linked.id : null } : null)])
  }
  const saveRef = useRef(saveText)
  saveRef.current = saveText
  useEffect(() => {
    const t = setTimeout(() => saveRef.current(), 600)
    return () => clearTimeout(t)
  }, [text])
  useEffect(() => () => saveRef.current(), [])

  const pick = (id: string, title: string) => {
    done.current = true
    setText(title)
    void engine.mutate([planSetDay(scope, date, { dish_text: title, recipe_id: id })])
    onClose()
  }

  const clear = () => {
    const prev = day
    done.current = true
    setText('')
    void engine.mutate([planSetDay(scope, date, null)])
    onClose()
    if (hasDish(prev)) {
      showUndo('Plato quitado', () => engine.mutate([planSetDay(scope, date, { dish_text: prev!.dish_text, recipe_id: prev!.recipe_id })]))
    }
  }

  // En tu menú, las saludables primero.
  const all = filterRecipes(recipes ?? [], query, null)
  // Primero favoritas; en tu menú, después tus recetas y las saludables.
  const rank = (r: (typeof all)[number]) =>
    (isFavorite(r.tags) ? 0 : 2) + (scope === 'yo' && !isMine(r.tags) && !r.tags?.includes('saludable') ? 1 : 0)
  const list = [...all].sort((a, b) => rank(a) - rank(b))

  return (
    <Sheet title={`${weekdayName(date)} ${formatShortDate(date)}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-gris">Escribe el plato</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={saveText}
            placeholder="Por ejemplo: Sopa de cocido"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && (saveText(), onClose())}
            className="min-h-14 rounded-2xl border-2 border-borde bg-white px-4 text-lg"
          />
        </label>

        <div className="flex gap-2">
          {linked && !linked.deleted_at && (
            <button onClick={() => onOpenRecipe(linked.id)} className="min-h-12 flex-1 rounded-2xl border-2 border-borde bg-white text-base font-semibold">
              📖 Ver receta
            </button>
          )}
          {(hasDish(day) || text.trim()) && (
            <button onClick={clear} className="min-h-12 flex-1 rounded-2xl border-2 border-terra bg-white text-base font-semibold text-terra">
              Quitar plato
            </button>
          )}
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-gris">O elige una receta</h3>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Buscar receta"
            className="min-h-14 rounded-2xl border-2 border-borde bg-white px-4 text-lg"
          />
          <ul className="flex flex-col gap-2">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => pick(r.id, r.title)}
                  className={`flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 bg-white text-left active:bg-terra-claro ${
                    day?.recipe_id === r.id ? 'border-terra' : 'border-borde'
                  }`}
                >
                  <RecipeImage recipe={r} className="h-14 w-14 shrink-0 text-2xl" />
                  <span className="py-2 pr-3 text-lg font-semibold leading-tight">
                    {isFavorite(r.tags) && <span className="mr-1 text-aviso">★</span>}
                    {r.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Sheet>
  )
}
