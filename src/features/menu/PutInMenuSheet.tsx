import { useMemo, useState } from 'react'
import { addDays, formatShortDate, formatWeekRange, mondayOf, today, weekDates, weekdayName } from '../../lib/dates'
import { usePersonalEnabled } from '../../lib/personal'
import { useEngine } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'
import { Sheet } from '../../ui/Sheet'
import type { Recipe } from '../recipes/logic'
import { useMenuDays, useRecipes } from '../recipes/hooks'
import { daysByDate, dishLabel, planSetDay, type MenuScope } from './logic'

interface Props {
  recipe: Pick<Recipe, 'id' | 'title' | 'tags'>
  /** Para las ideas: guarda la receta en el recetario antes de ponerla en el menú. */
  ensureSaved?: () => Promise<string>
  onClose: () => void
}

/** Elegir el día (y el menú, si esta es tu app) en que se pone una receta. */
export function PutInMenuSheet({ recipe, ensureSaved, onClose }: Props) {
  const engine = useEngine()
  const { showUndo } = useFeedback()
  const personal = usePersonalEnabled()
  const [scope, setScope] = useState<MenuScope>(personal && recipe.tags?.includes('saludable') ? 'yo' : 'familia')
  const days = useMenuDays()
  const recipes = useRecipes()
  const byDate = useMemo(() => daysByDate(days ?? [], scope), [days, scope])
  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const thisMonday = mondayOf(today())
  const weeks = [thisMonday, addDays(thisMonday, 7)]

  const choose = async (date: string) => {
    const prev = byDate.get(date)
    const recipeId = ensureSaved ? await ensureSaved() : recipe.id
    await engine.mutate([planSetDay(scope, date, { dish_text: recipe.title, recipe_id: recipeId })])
    onClose()
    const where = scope === 'yo' ? 'en tu menú' : 'en el menú'
    showUndo(`Puesto ${where} el ${weekdayName(date).toLowerCase()} ${formatShortDate(date)}`, () =>
      engine.mutate([
        planSetDay(scope, date, prev && !prev.deleted_at ? { dish_text: prev.dish_text, recipe_id: prev.recipe_id } : null),
      ]),
    )
  }

  return (
    <Sheet title="¿Qué día?" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {personal && (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Menú">
            {(['familia', 'yo'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={`min-h-14 rounded-2xl border-2 text-base font-bold ${scope === s ? 'border-terra bg-terra text-white' : 'border-borde bg-white'}`}
              >
                {s === 'familia' ? '👨‍👩‍👧‍👦 Menú familiar' : '🥗 Mi menú'}
              </button>
            ))}
          </div>
        )}
        {weeks.map((monday, wi) => (
          <section key={monday}>
            <h3 className="mb-2 text-base font-bold text-gris">
              {wi === 0 ? 'Esta semana' : 'Semana que viene'} · {formatWeekRange(monday)}
            </h3>
            <ul className="flex flex-col gap-2">
              {weekDates(monday)
                .filter((d) => d >= today())
                .map((date) => {
                  const current = dishLabel(byDate.get(date), recipeMap)
                  return (
                    <li key={date}>
                      <button
                        onClick={() => void choose(date)}
                        className="flex min-h-16 w-full flex-col justify-center rounded-2xl border-2 border-borde bg-white px-4 py-2 text-left active:bg-terra-claro"
                      >
                        <span className="text-lg font-bold">
                          {weekdayName(date)} <span className="font-normal text-gris">{formatShortDate(date)}</span>
                        </span>
                        <span className="text-base text-gris">{current ? `Ahora: ${current}` : 'Libre'}</span>
                      </button>
                    </li>
                  )
                })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
