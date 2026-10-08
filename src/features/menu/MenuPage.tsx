import { useMemo, useState } from 'react'
import { addDays, formatShortDate, formatWeekRange, mondayOf, today, weekDates, weekdayName } from '../../lib/dates'
import { ingredientsForShopping } from '../recipes/logic'
import { useMenuDays, useRecipes } from '../recipes/hooks'
import { useAddToShopping } from '../shopping/useAddToShopping'
import { CopyWeekSheet } from './CopyWeekSheet'
import { DaySheet } from './DaySheet'
import { daysByDate, dishLabel, type MenuScope } from './logic'

function weekCaption(monday: string, current: string): string {
  const diff = Math.round((Date.parse(monday) - Date.parse(current)) / (7 * 86_400_000))
  if (diff === 0) return 'Esta semana'
  if (diff === -1) return 'Semana pasada'
  if (diff === 1) return 'Semana que viene'
  return diff < 0 ? `Hace ${-diff} semanas` : `Dentro de ${diff} semanas`
}

export function MenuPage({ go, scope = 'familia' }: { go: (path: string) => void; scope?: MenuScope }) {
  const days = useMenuDays()
  const recipes = useRecipes()
  const currentMonday = mondayOf(today())
  const [monday, setMonday] = useState(currentMonday)
  const [editing, setEditing] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)

  const addToShopping = useAddToShopping()
  const byDate = useMemo(() => daysByDate(days ?? [], scope), [days, scope])
  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const todayIso = today()

  // Ingredientes de todas las recetas de la semana, a la lista que toca.
  const weekRecipes = weekDates(monday)
    .map((d) => byDate.get(d))
    .map((d) => (d && !d.deleted_at && d.recipe_id ? recipeMap.get(d.recipe_id) : undefined))
    .filter((r) => r && !r.deleted_at)
  const addWeekToShopping = () =>
    addToShopping(weekRecipes.flatMap((r) => ingredientsForShopping(r!)), scope === 'yo' ? 'yo' : 'familia')

  if (days === undefined) return <p className="p-6 text-center text-lg text-gris">Cargando…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMonday(addDays(monday, -7))}
          aria-label="Semana anterior"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-borde bg-white text-3xl font-bold"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-lg leading-tight font-bold">{weekCaption(monday, currentMonday)}</p>
          <p className="text-base text-gris">{formatWeekRange(monday)}</p>
        </div>
        <button
          onClick={() => setMonday(addDays(monday, 7))}
          aria-label="Semana siguiente"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-borde bg-white text-3xl font-bold"
        >
          ›
        </button>
      </div>

      {monday !== currentMonday && (
        <button onClick={() => setMonday(currentMonday)} className="min-h-12 rounded-full bg-terra-claro text-base font-bold text-terra-oscuro">
          Volver a esta semana
        </button>
      )}

      <ul className="flex flex-col gap-2">
        {weekDates(monday).map((date) => {
          const label = dishLabel(byDate.get(date), recipeMap)
          const isToday = date === todayIso
          return (
            <li key={date}>
              <button
                onClick={() => setEditing(date)}
                className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left active:bg-crema-oscuro ${
                  isToday ? 'border-terra shadow-md' : 'border-borde'
                }`}
              >
                <span className="flex w-24 shrink-0 flex-col">
                  <span className={`text-lg leading-tight font-bold ${isToday ? 'text-terra' : ''}`}>{weekdayName(date)}</span>
                  <span className="text-sm text-gris">{isToday ? 'Hoy' : formatShortDate(date)}</span>
                </span>
                <span className={`min-w-0 flex-1 text-lg leading-snug ${label ? 'font-semibold' : 'text-gris/80'}`}>
                  {label ?? 'Toca para poner plato'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {weekRecipes.length > 0 && (
        <button onClick={() => void addWeekToShopping()} className="min-h-14 rounded-2xl bg-terra px-3 text-lg font-bold text-white active:scale-[0.98]">
          🛒 Ingredientes de la semana a {scope === 'yo' ? 'mi compra' : 'la compra'}
        </button>
      )}
      <button onClick={() => setCopying(true)} className="min-h-14 rounded-2xl border-2 border-borde bg-white text-lg font-semibold">
        📋 Copiar de otra semana
      </button>

      {editing && (
        <DaySheet
          key={editing}
          scope={scope}
          date={editing}
          day={byDate.get(editing)}
          onClose={() => setEditing(null)}
          onOpenRecipe={(id) => {
            setEditing(null)
            go(`recetas/${id}`)
          }}
        />
      )}
      {copying && <CopyWeekSheet scope={scope} targetMonday={monday} byDate={byDate} onClose={() => setCopying(false)} />}
    </div>
  )
}
